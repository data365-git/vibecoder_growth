import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { webhookCallback } from 'grammy';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lt } from 'drizzle-orm';
import { env } from './env.js';
import { db, pool } from './db/client.js';
import * as schema from './db/schema/growth.js';
import { createBot } from './bot/index.js';
import { startScheduler } from './scheduler.js';
import { authRoutes } from './routes/auth.js';
import { vibecoderRoutes } from './routes/vibecoders.js';
import { reportRoutes } from './routes/reports.js';
import { growthLogRoutes } from './routes/growth-logs.js';
import { scoreRoutes } from './routes/scores.js';
import { settingRoutes } from './routes/settings.js';
import { weeklyRoutes } from './routes/weekly.js';

const app = new Hono();
app.use('*', cors());

// /live — instant liveness probe, no DB call
app.get('/live', (c) => c.text('ok'));

// /ready — readiness probe, DB must be reachable
app.get('/ready', async (c) => {
  try {
    await pool.query('SELECT 1');
    return c.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    return c.json({ ok: false, error: String(err) }, 503);
  }
});

app.route('/api/auth', authRoutes);
app.route('/api/vibecoders', vibecoderRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/growth-logs', growthLogRoutes);
app.route('/api/scores', scoreRoutes);
app.route('/api/settings', settingRoutes);
app.route('/api/weekly', weeklyRoutes);

// ---------- Serve the admin web UI ----------
// In Docker: server CWD is /app/server, web build is at /app/web/dist.
// Locally: from server/ the web build is at ../web/dist.
const here = path.dirname(fileURLToPath(import.meta.url));
const webDistCandidates = [
  path.resolve(process.cwd(), '../web/dist'),
  path.resolve(here, '../../../web/dist'),
  path.resolve(here, '../../web/dist'),
];
const webRoot = webDistCandidates.find((p) => fs.existsSync(path.join(p, 'index.html')));
if (webRoot) {
  console.log(`[web] serving static UI from ${webRoot}`);
  app.use('/assets/*', serveStatic({ root: path.relative(process.cwd(), webRoot) || '.' }));
  app.use('/favicon.ico', serveStatic({ path: path.join(webRoot, 'favicon.ico') }));
  // SPA fallback: any non-API, non-bot GET returns index.html so React Router takes over.
  app.get('*', async (c) => {
    const p = c.req.path;
    if (p.startsWith('/api/') || p === '/bot' || p === '/live' || p === '/ready') return c.notFound();
    const indexHtml = fs.readFileSync(path.join(webRoot, 'index.html'), 'utf-8');
    return c.html(indexHtml);
  });
} else {
  console.warn('[web] no web/dist found — admin UI will 404. Run `pnpm --filter @vg/web build`.');
}

async function runMigrations() {
  // Resolve migrations folder relative to the compiled entry point.
  // tsc only emits .ts -> .js; .sql/.json migration files are NOT copied, so the
  // dist tree contains empty folders for the migrations directory. Prefer the
  // source tree (which is also COPYed into the runner image) instead.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), 'src/db/migrations'),
    path.resolve(process.cwd(), 'server/src/db/migrations'),
    path.resolve(here, '../../src/db/migrations'),
    path.resolve(here, '../src/db/migrations'),
    path.resolve(here, './db/migrations'),
  ];
  const skip = /ENOENT|no such file|journal\.json|Can't find meta/i;
  for (const folder of candidates) {
    try {
      console.log(`[migrate] trying ${folder}`);
      await migrate(db, { migrationsFolder: folder });
      console.log('[migrate] applied');
      return;
    } catch (err) {
      if (err instanceof Error && skip.test(err.message)) continue;
      throw err;
    }
  }
  console.warn('[migrate] no usable migrations folder found, continuing (CMD likely already ran them)');
}

// Telegram only allows one process per bot token to call getUpdates at a
// time. During a Railway rotation, the old container is still polling for
// a few seconds when the new one starts — without retry, the new bot
// crashes with 409 Conflict and the deploy is marked failed. We also drop
// pending updates once, which clears any half-done conversation sessions
// left over from a previous crash (the ACHAM problem).
function startPollingWithRetry(bot: ReturnType<typeof createBot>) {
  const MAX_ATTEMPTS = 8;
  const DELAY_MS = 5_000;
  let attempt = 0;

  const run = async () => {
    attempt++;
    try {
      if (attempt === 1) {
        try {
          await bot.api.deleteWebhook({ drop_pending_updates: true });
        } catch (e) {
          console.warn('[bot] deleteWebhook failed (continuing):', e);
        }
      }
      await bot.start({ onStart: () => console.log(`[bot] polling started (attempt ${attempt})`) });
    } catch (err: any) {
      const code = err?.error_code ?? err?.code;
      const is409 = code === 409 || /409|terminated by other getUpdates/i.test(String(err?.description ?? err?.message ?? err));
      if (is409 && attempt < MAX_ATTEMPTS) {
        console.log(`[bot] 409 conflict — waiting ${DELAY_MS}ms for the old instance to die (attempt ${attempt}/${MAX_ATTEMPTS})`);
        await new Promise((r) => setTimeout(r, DELAY_MS));
        return run();
      }
      console.error('[bot] polling failed permanently:', err?.description ?? err?.message ?? err);
      process.exit(1);
    }
  };

  // Fire-and-forget: bot.start() blocks until polling exits, so the rest
  // of main() must continue without awaiting (matching prior behavior).
  void run();
}

// Sweep half-finished conversation sessions that have been sitting idle
// for more than an hour. A normal wizard takes ~2 minutes; anything that
// old is either a forgotten attempt or a session from before a crash. The
// 1-hour grace is enough to preserve someone actively typing, but it
// reliably clears the kind of zombie session that crash-loops the bot on
// restart (we hit this with the ACHAM /status replay).
async function sweepStaleSessions() {
  const TTL_MS = 24 * 60 * 60 * 1000;
  // 5-minute window: a real wizard takes ~2 min; anything older is a
  // crash-loop zombie or a forgotten attempt. Tighter than 1 hour so a
  // user who hit a stuck conversation gets unstuck on next bot restart.
  const cutoff = new Date(Date.now() + TTL_MS - 5 * 60 * 1000);
  try {
    const deleted = await db
      .delete(schema.botSessions)
      .where(lt(schema.botSessions.expiresAt, cutoff))
      .returning({ key: schema.botSessions.key });
    if (deleted.length > 0) {
      console.log(`[boot] cleared ${deleted.length} stale bot session(s)`);
    }
  } catch (err) {
    console.warn('[boot] sweepStaleSessions failed (continuing):', err);
  }
}

async function main() {
  console.log('[boot] build marker BC-2026-05-17-PERF');
  await runMigrations();
  await sweepStaleSessions();
  let bot: ReturnType<typeof createBot> | undefined;
  if (env.GROWTH_BOT_TOKEN && env.BOT_MODE !== 'off') {
    bot = createBot();
    if (env.BOT_MODE === 'webhook') {
      if (!env.WEBHOOK_URL) throw new Error('WEBHOOK_URL required for webhook mode');
      app.post('/bot', webhookCallback(bot, 'hono'));
      const webhookUrl = `${env.WEBHOOK_URL.replace(/\/$/, '')}/bot`;
      // drop_pending_updates clears any updates Telegram has buffered from a
      // previous run that may now be stale or trigger replay crashes.
      await bot.api.setWebhook(webhookUrl, { drop_pending_updates: true });
      console.log('[bot] webhook configured at', webhookUrl);
    } else {
      startPollingWithRetry(bot);
    }
    startScheduler(bot);
  } else {
    console.log('[bot] disabled (no token or BOT_MODE=off)');
  }

  const shutdown = async (sig: string) => {
    console.log(`[shutdown] ${sig} received`);
    try { await bot?.stop(); } catch (e) { console.warn('[shutdown] bot.stop failed', e); }
    try { await pool.end(); } catch (e) { console.warn('[shutdown] pool.end failed', e); }
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`[server] http://localhost:${info.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

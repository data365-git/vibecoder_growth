import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { webhookCallback } from 'grammy';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { db } from './db/client.js';
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

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

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
    if (p.startsWith('/api/') || p === '/bot' || p === '/health') return c.notFound();
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

async function main() {
  await runMigrations();
  let bot;
  if (env.GROWTH_BOT_TOKEN && env.BOT_MODE !== 'off') {
    bot = createBot();
    if (env.BOT_MODE === 'webhook') {
      if (!env.WEBHOOK_URL) throw new Error('WEBHOOK_URL required for webhook mode');
      app.post('/bot', webhookCallback(bot, 'hono'));
      await bot.api.setWebhook(`${env.WEBHOOK_URL.replace(/\/$/, '')}/bot`);
      console.log('[bot] webhook configured');
    } else {
      bot.start({ onStart: () => console.log('[bot] polling started') });
    }
    startScheduler(bot);
  } else {
    console.log('[bot] disabled (no token or BOT_MODE=off)');
  }

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`[server] http://localhost:${info.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { webhookCallback } from 'grammy';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
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

const app = new Hono();
app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.route('/api/auth', authRoutes);
app.route('/api/vibecoders', vibecoderRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/growth-logs', growthLogRoutes);
app.route('/api/scores', scoreRoutes);
app.route('/api/settings', settingRoutes);

async function runMigrations() {
  // Resolve migrations folder relative to the compiled entry point.
  // After build: dist/index.js → ../src/db/migrations. But we also copy src tree at build, so try both.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../src/db/migrations'),
    path.resolve(here, './db/migrations'),
    path.resolve(process.cwd(), 'src/db/migrations'),
    path.resolve(process.cwd(), 'server/src/db/migrations'),
  ];
  for (const folder of candidates) {
    try {
      console.log(`[migrate] trying ${folder}`);
      await migrate(db, { migrationsFolder: folder });
      console.log('[migrate] applied');
      return;
    } catch (err) {
      if (err instanceof Error && /ENOENT|no such file/.test(err.message)) continue;
      throw err;
    }
  }
  throw new Error('No migrations folder found in any candidate path');
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

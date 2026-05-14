import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { webhookCallback } from 'grammy';
import { env } from './env.js';
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

async function main() {
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

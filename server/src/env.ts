import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  GROWTH_BOT_TOKEN: z.string().optional(),
  // Legacy plain-text channel target — kept for back-compat with the
  // 18:00 daily summary cron and the previous report forward path.
  GROWTH_REPORTING_CHAT_ID: z.string().optional(),
  // Single group where every vibecoder's daily card lives (one rolling
  // message per person per day, edited in place by the bot).
  GROWTH_GROUP_CHAT_ID: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(6).optional(),
  BOT_MODE: z.enum(['polling', 'webhook', 'off']).default('polling'),
  WEBHOOK_URL: z.string().optional(),
  TZ: z.string().default('Asia/Tashkent'),
});

export const env = schema.parse(process.env);
export type Env = typeof env;

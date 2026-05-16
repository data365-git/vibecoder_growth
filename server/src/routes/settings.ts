import { Hono } from 'hono';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin, type AdminVars } from './_auth-mw.js';
import { env } from '../env.js';

export const settingRoutes = new Hono<AdminVars>();
settingRoutes.use('*', requireAdmin);

// Compute the inclusive [startYmd, endYmd] window (in env.TZ) the wipe
// should cover. Week = Monday-of-now through Sunday-of-now.
function ymdInTz(d: Date): string {
  return new Date(d.toLocaleString('en-US', { timeZone: env.TZ })).toISOString().slice(0, 10);
}
function wipeWindow(mode: 'today' | 'week'): { start: string; end: string } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: env.TZ }));
  if (mode === 'today') {
    const ymd = ymdInTz(now);
    return { start: ymd, end: ymd };
  }
  // ISO week: Monday = 1 ... Sunday = 7
  const dow = ((now.getDay() + 6) % 7); // 0=Mon
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: ymdInTz(monday), end: ymdInTz(sunday) };
}

// Delete every activity row whose effective Tashkent-wall date falls within
// the window. Roster (admins / vibecoders / growth_managers) is preserved.
// FK CASCADE handles final_deliveries (briefs) and score_components.
async function wipeRange(start: string, end: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const tz = env.TZ;

  const reports = await db
    .delete(s.dailyReports)
    .where(sql`${s.dailyReports.reportDate} BETWEEN ${start} AND ${end}`)
    .returning({ id: s.dailyReports.id });
  counts.daily_reports = reports.length;

  const standups = await db
    .delete(s.dailyStandups)
    .where(sql`${s.dailyStandups.standupDate} BETWEEN ${start} AND ${end}`)
    .returning({ id: s.dailyStandups.id });
  counts.daily_standups = standups.length;

  const cards = await db
    .delete(s.dailyCards)
    .where(sql`${s.dailyCards.cardDate} BETWEEN ${start} AND ${end}`)
    .returning({ id: s.dailyCards.id });
  counts.daily_cards = cards.length;

  const statuses = await db
    .delete(s.statusUpdates)
    .where(sql`(${s.statusUpdates.sentAt} AT TIME ZONE ${tz})::date BETWEEN ${start} AND ${end}`)
    .returning({ id: s.statusUpdates.id });
  counts.status_updates = statuses.length;

  const briefs = await db
    .delete(s.taskOwnershipBriefs)
    .where(sql`(${s.taskOwnershipBriefs.createdAt} AT TIME ZONE ${tz})::date BETWEEN ${start} AND ${end}`)
    .returning({ id: s.taskOwnershipBriefs.id });
  counts.task_ownership_briefs = briefs.length;

  const reminders = await db
    .delete(s.botReminders)
    .where(sql`(${s.botReminders.scheduledFor} AT TIME ZONE ${tz})::date BETWEEN ${start} AND ${end}`)
    .returning({ id: s.botReminders.id });
  counts.bot_reminders = reminders.length;

  // Weekly reviews are bucketed by week_start (Monday).
  const weeklies = await db
    .delete(s.weeklyGrowthReviews)
    .where(sql`${s.weeklyGrowthReviews.weekStart} BETWEEN ${start} AND ${end}`)
    .returning({ id: s.weeklyGrowthReviews.id });
  counts.weekly_growth_reviews = weeklies.length;

  return counts;
}

const wipeSchema = z.object({ mode: z.enum(['today', 'week']) });

settingRoutes.post('/wipe-data', async (c) => {
  const admin = c.get('admin');
  if (admin.role !== 'owner' && admin.role !== 'admin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = wipeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

  const { start, end } = wipeWindow(parsed.data.mode);
  const counts = await wipeRange(start, end);
  console.log(
    `[wipe] admin=${admin.email} mode=${parsed.data.mode} range=${start}..${end} → ${JSON.stringify(counts)}`,
  );
  return c.json({ ok: true, mode: parsed.data.mode, start, end, counts });
});

settingRoutes.get('/', async (c) => {
  const rows = await db.select().from(s.growthSettings);
  const obj: Record<string, unknown> = {};
  for (const r of rows) obj[r.key] = r.value;
  return c.json(obj);
});

// Read-only system status surface for the admin UI. Deliberately does NOT
// expose the bot token or webhook URL — both are secret-equivalent.
settingRoutes.get('/status', (c) => {
  return c.json({
    botMode: env.BOT_MODE,
    groupConfigured: Boolean(env.GROWTH_GROUP_CHAT_ID),
    timezone: env.TZ,
    version: process.env.npm_package_version ?? '0.1.0',
  });
});

const putSchema = z.object({ key: z.string().min(1).max(64), value: z.unknown() });

settingRoutes.put('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);
  await db
    .insert(s.growthSettings)
    .values({ key: parsed.data.key, value: parsed.data.value as any })
    .onConflictDoUpdate({
      target: s.growthSettings.key,
      set: { value: parsed.data.value as any, updatedAt: new Date() },
    });
  return c.json({ ok: true });
});

import { Hono } from 'hono';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';

export const reportRoutes = new Hono();
reportRoutes.use('*', requireAdmin);

reportRoutes.get('/', async (c) => {
  const date = c.req.query('date');
  const vibecoderId = c.req.query('vibecoderId');
  const conditions = [] as any[];
  if (date) conditions.push(eq(s.dailyReports.reportDate, date));
  if (vibecoderId) conditions.push(eq(s.dailyReports.vibecoderId, Number(vibecoderId)));
  const rows = await db
    .select()
    .from(s.dailyReports)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(s.dailyReports.reportDate), s.dailyReports.vibecoderId);
  return c.json(rows.map((r) => ({ ...r, forwardedMessageId: r.forwardedMessageId ? String(r.forwardedMessageId) : null })));
});

reportRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [row] = await db.select().from(s.dailyReports).where(eq(s.dailyReports.id, id));
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ ...row, forwardedMessageId: row.forwardedMessageId ? String(row.forwardedMessageId) : null });
});

reportRoutes.get('/standup/today', async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const date = c.req.query('date') ?? today;
  const rows = await db.select().from(s.dailyStandups).where(eq(s.dailyStandups.standupDate, date));
  return c.json(rows);
});

reportRoutes.get('/status/active', async (c) => {
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(s.statusUpdates)
    .where(gte(s.statusUpdates.sentAt, since))
    .orderBy(desc(s.statusUpdates.sentAt));
  return c.json(rows);
});

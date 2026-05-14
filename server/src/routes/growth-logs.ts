import { Hono } from 'hono';
import { desc, eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';

export const growthLogRoutes = new Hono();
growthLogRoutes.use('*', requireAdmin);

const TABLE_MAP = {
  design: s.designRefs,
  business: s.businessNotes,
  learning: s.learningNotes,
  explain: s.explainNotes,
  book: s.bookReflections,
} as const;

growthLogRoutes.get('/:type', async (c) => {
  const type = c.req.param('type') as keyof typeof TABLE_MAP;
  const tbl = TABLE_MAP[type];
  if (!tbl) return c.json({ error: 'unknown_type' }, 400);
  const vibecoderId = c.req.query('vibecoderId');
  const rows = await db
    .select()
    .from(tbl as any)
    .where(vibecoderId ? eq((tbl as any).vibecoderId, Number(vibecoderId)) : undefined)
    .orderBy(desc((tbl as any).createdAt))
    .limit(200);
  return c.json(rows);
});

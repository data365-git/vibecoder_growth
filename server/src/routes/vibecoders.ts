import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';

export const vibecoderRoutes = new Hono();
vibecoderRoutes.use('*', requireAdmin);

// bigint columns (tgUserId, baseSalaryUzs, bonusBaselineUzs) can't be
// passed to JSON.stringify directly — convert them on every response.
function serializeVibecoder<T extends typeof s.vibecoders.$inferSelect | undefined>(r: T) {
  if (!r) return r;
  return {
    ...r,
    tgUserId: r.tgUserId ? String(r.tgUserId) : null,
    baseSalaryUzs: Number(r.baseSalaryUzs),
    bonusBaselineUzs: Number(r.bonusBaselineUzs),
  };
}

vibecoderRoutes.get('/', async (c) => {
  const rows = await db.select().from(s.vibecoders).orderBy(desc(s.vibecoders.active), s.vibecoders.fullNameRu);
  return c.json(rows.map(serializeVibecoder));
});

const upsertSchema = z.object({
  id: z.number().optional(),
  tgUsername: z.string().min(1),
  fullNameRu: z.string().min(1),
  role: z.string().default('vibecoder'),
  // Nullable in the DB; the form GETs the row (with `null`) and PUTs it
  // back as-is, so we must accept null in addition to a date string.
  startDate: z.string().nullable().optional(),
  baseSalaryUzs: z.number().int().nonnegative().default(0),
  bonusBaselineUzs: z.number().int().nonnegative().default(0),
  timezone: z.string().default('Asia/Tashkent'),
  active: z.boolean().default(true),
});

vibecoderRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request', issues: parsed.error.issues }, 400);
  const d = parsed.data;
  if (d.id) {
    const [updated] = await db
      .update(s.vibecoders)
      .set({
        tgUsername: d.tgUsername,
        fullNameRu: d.fullNameRu,
        role: d.role,
        startDate: d.startDate ?? null,
        baseSalaryUzs: d.baseSalaryUzs,
        bonusBaselineUzs: d.bonusBaselineUzs,
        timezone: d.timezone,
        active: d.active,
      })
      .where(eq(s.vibecoders.id, d.id))
      .returning();
    return c.json(serializeVibecoder(updated));
  }
  const [created] = await db
    .insert(s.vibecoders)
    .values({
      tgUsername: d.tgUsername,
      fullNameRu: d.fullNameRu,
      role: d.role,
      startDate: d.startDate ?? null,
      baseSalaryUzs: d.baseSalaryUzs,
      bonusBaselineUzs: d.bonusBaselineUzs,
      timezone: d.timezone,
      active: d.active,
    })
    .returning();
  return c.json(serializeVibecoder(created), 201);
});

vibecoderRoutes.patch('/:id/active', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({ active: false }));
  const [row] = await db.update(s.vibecoders).set({ active: Boolean(body.active) }).where(eq(s.vibecoders.id, id)).returning();
  return c.json(serializeVibecoder(row));
});

vibecoderRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(s.vibecoders).where(eq(s.vibecoders.id, id));
  return c.json({ ok: true });
});

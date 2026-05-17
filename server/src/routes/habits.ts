import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';

export const habitRoutes = new Hono();
habitRoutes.use('*', requireAdmin);

const PILLAR_VALUES = [
  'discipline_reporting',
  'uxui_taste',
  'business_thinking',
  'professional_learning',
  'simple_explanation',
  'deadline_ownership',
] as const;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const listSchema = z.object({
  vibecoderId: z.coerce.number().int().positive(),
  from: dateString,
  to: dateString,
});

habitRoutes.get('/', async (c) => {
  const parsed = listSchema.safeParse({
    vibecoderId: c.req.query('vibecoderId'),
    from: c.req.query('from'),
    to: c.req.query('to'),
  });
  if (!parsed.success) return c.json({ error: 'bad_request', issues: parsed.error.issues }, 400);
  const { vibecoderId, from, to } = parsed.data;
  const rows = await db
    .select()
    .from(s.habitMarks)
    .where(
      and(
        eq(s.habitMarks.vibecoderId, vibecoderId),
        gte(s.habitMarks.markDate, from),
        lte(s.habitMarks.markDate, to),
      ),
    )
    .orderBy(desc(s.habitMarks.markDate));
  return c.json(rows);
});

const upsertSchema = z.object({
  vibecoderId: z.number().int().positive(),
  markDate: dateString,
  pillar: z.enum(PILLAR_VALUES),
  status: z.enum(['done', 'not_done']).nullable(),
  note: z.string().optional(),
});

habitRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request', issues: parsed.error.issues }, 400);
  const d = parsed.data;

  if (d.pillar === 'discipline_reporting') {
    return c.json(
      {
        error: 'discipline_is_auto',
        message: 'Discipline & reporting is auto-derived from daily reports.',
      },
      400,
    );
  }

  if (d.status === null) {
    await db
      .delete(s.habitMarks)
      .where(
        and(
          eq(s.habitMarks.vibecoderId, d.vibecoderId),
          eq(s.habitMarks.markDate, d.markDate),
          eq(s.habitMarks.pillar, d.pillar),
        ),
      );
    return c.json({ ok: true, cleared: true });
  }

  const [row] = await db
    .insert(s.habitMarks)
    .values({
      vibecoderId: d.vibecoderId,
      markDate: d.markDate,
      pillar: d.pillar,
      status: d.status,
      note: d.note ?? null,
    })
    .onConflictDoUpdate({
      target: [s.habitMarks.vibecoderId, s.habitMarks.markDate, s.habitMarks.pillar],
      set: {
        status: d.status,
        note: d.note ?? null,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return c.json(row);
});

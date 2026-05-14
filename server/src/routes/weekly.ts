import { Hono } from 'hono';
import { z } from 'zod';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';
import { syncNow } from '../notion/sync.js';

export const weeklyRoutes = new Hono();
weeklyRoutes.use('*', requireAdmin);

function isoYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekBounds(weekStart: string): { start: string; end: string } {
  const [y, m, d] = weekStart.split('-').map(Number);
  const startD = new Date(Date.UTC(y!, m! - 1, d!));
  const endD = new Date(Date.UTC(y!, m! - 1, d! + 6));
  return { start: isoYmd(startD), end: isoYmd(endD) };
}

function currentMondayYmd(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return isoYmd(monday);
}

weeklyRoutes.get('/', async (c) => {
  const weekStart = c.req.query('weekStart') ?? currentMondayYmd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return c.json({ error: 'bad_weekStart' }, 400);
  const { start, end } = weekBounds(weekStart);

  const vcs = await db.select().from(s.vibecoders).where(eq(s.vibecoders.active, true));
  const result: any[] = [];
  for (const vc of vcs) {
    const designs = await db
      .select()
      .from(s.designRefs)
      .where(
        and(
          eq(s.designRefs.vibecoderId, vc.id),
          gte(s.designRefs.createdAt, new Date(`${start}T00:00:00Z`)),
          lte(s.designRefs.createdAt, new Date(`${end}T23:59:59Z`)),
        ),
      )
      .orderBy(desc(s.designRefs.createdAt));
    const business = await db
      .select()
      .from(s.businessNotes)
      .where(
        and(
          eq(s.businessNotes.vibecoderId, vc.id),
          gte(s.businessNotes.createdAt, new Date(`${start}T00:00:00Z`)),
          lte(s.businessNotes.createdAt, new Date(`${end}T23:59:59Z`)),
        ),
      )
      .orderBy(desc(s.businessNotes.createdAt));
    const learning = await db
      .select()
      .from(s.learningNotes)
      .where(
        and(
          eq(s.learningNotes.vibecoderId, vc.id),
          gte(s.learningNotes.createdAt, new Date(`${start}T00:00:00Z`)),
          lte(s.learningNotes.createdAt, new Date(`${end}T23:59:59Z`)),
        ),
      )
      .orderBy(desc(s.learningNotes.createdAt));
    const explain = await db
      .select()
      .from(s.explainNotes)
      .where(
        and(
          eq(s.explainNotes.vibecoderId, vc.id),
          gte(s.explainNotes.createdAt, new Date(`${start}T00:00:00Z`)),
          lte(s.explainNotes.createdAt, new Date(`${end}T23:59:59Z`)),
        ),
      )
      .orderBy(desc(s.explainNotes.createdAt));
    const [existing] = await db
      .select()
      .from(s.weeklyGrowthReviews)
      .where(and(eq(s.weeklyGrowthReviews.vibecoderId, vc.id), eq(s.weeklyGrowthReviews.weekStart, weekStart)));

    result.push({
      vibecoderId: vc.id,
      fullNameRu: vc.fullNameRu,
      designRefs: designs,
      businessNotes: business,
      learningNotes: learning,
      explainNotes: explain,
      existing,
    });
  }
  return c.json({ weekStart, rangeStart: start, rangeEnd: end, rows: result });
});

const saveSchema = z.object({
  vibecoderId: z.number().int().positive(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  designRefIds: z.array(z.number().int().positive()).max(10).default([]),
  businessNoteId: z.number().int().positive().nullable().optional(),
  learningNoteId: z.number().int().positive().nullable().optional(),
  explainNoteId: z.number().int().positive().nullable().optional(),
  improvementApplied: z.string().optional().nullable(),
  taskExample: z.string().optional().nullable(),
  managerNotes: z.string().optional().nullable(),
  markReviewed: z.boolean().optional(),
});

weeklyRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request', issues: parsed.error.issues }, 400);
  const d = parsed.data;

  const [existing] = await db
    .select()
    .from(s.weeklyGrowthReviews)
    .where(and(eq(s.weeklyGrowthReviews.vibecoderId, d.vibecoderId), eq(s.weeklyGrowthReviews.weekStart, d.weekStart)));

  const reviewedAt = d.markReviewed ? new Date() : existing?.reviewedAt ?? null;

  let saved;
  if (existing) {
    [saved] = await db
      .update(s.weeklyGrowthReviews)
      .set({
        designRefIds: d.designRefIds,
        businessNoteId: d.businessNoteId ?? null,
        learningNoteId: d.learningNoteId ?? null,
        explainNoteId: d.explainNoteId ?? null,
        improvementApplied: d.improvementApplied ?? null,
        taskExample: d.taskExample ?? null,
        managerNotes: d.managerNotes ?? null,
        reviewedAt,
      })
      .where(eq(s.weeklyGrowthReviews.id, existing.id))
      .returning();
  } else {
    [saved] = await db
      .insert(s.weeklyGrowthReviews)
      .values({
        vibecoderId: d.vibecoderId,
        weekStart: d.weekStart,
        designRefIds: d.designRefIds,
        businessNoteId: d.businessNoteId ?? null,
        learningNoteId: d.learningNoteId ?? null,
        explainNoteId: d.explainNoteId ?? null,
        improvementApplied: d.improvementApplied ?? null,
        taskExample: d.taskExample ?? null,
        managerNotes: d.managerNotes ?? null,
        reviewedAt,
      })
      .returning();
  }

  // Sync to Notion if reviewed
  if (saved && reviewedAt) {
    try {
      await syncNow('weekly_growth_reviews', saved as any);
    } catch (err) {
      console.error('weekly sync to Notion failed:', err);
    }
  }

  return c.json(saved);
});

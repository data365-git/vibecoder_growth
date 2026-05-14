import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';
import { computeScoreForMonth, persistAutoScore } from '../scoring/compute.js';
import { tierForTotal, bonusAmount } from '../scoring/tiers.js';

export const scoreRoutes = new Hono();
scoreRoutes.use('*', requireAdmin);

scoreRoutes.get('/:yyyymm', async (c) => {
  const ym = c.req.param('yyyymm');
  if (!/^\d{4}-\d{2}$/.test(ym)) return c.json({ error: 'bad_yyyymm' }, 400);
  const vcs = await db.select().from(s.vibecoders).where(eq(s.vibecoders.active, true));
  const rows = await db.select().from(s.monthlyScores).where(eq(s.monthlyScores.yearMonth, ym));
  const byVc = new Map(rows.map((r) => [r.vibecoderId, r] as const));
  const result = [] as any[];
  for (const vc of vcs) {
    const existing = byVc.get(vc.id);
    const auto = await computeScoreForMonth(vc.id, ym);
    result.push({
      vibecoderId: vc.id,
      fullNameRu: vc.fullNameRu,
      bonusBaselineUzs: Number(vc.bonusBaselineUzs),
      existing: existing
        ? { ...existing, bonusPaidUzs: Number(existing.bonusPaidUzs) }
        : null,
      auto,
      projectedTier: tierForTotal(existing?.total ?? auto.total),
      projectedBonusUzs: bonusAmount(existing?.total ?? auto.total, Number(vc.bonusBaselineUzs)),
    });
  }
  return c.json({ yearMonth: ym, rows: result });
});

scoreRoutes.post('/:yyyymm/recompute', async (c) => {
  const ym = c.req.param('yyyymm');
  const vcs = await db.select().from(s.vibecoders).where(eq(s.vibecoders.active, true));
  for (const vc of vcs) await persistAutoScore(vc.id, ym);
  return c.json({ ok: true, count: vcs.length });
});

const overrideSchema = z.object({
  deadlineOwnership: z.number().int().min(0).max(25).optional(),
  uxuiTaste: z.number().int().min(0).max(20).optional(),
  businessThinking: z.number().int().min(0).max(20).optional(),
  professionalLearning: z.number().int().min(0).max(15).optional(),
  simpleExplanation: z.number().int().min(0).max(10).optional(),
  disciplineReporting: z.number().int().min(0).max(10).optional(),
  pmNotes: z.string().optional(),
});

scoreRoutes.patch('/:yyyymm/:vibecoderId', async (c) => {
  const ym = c.req.param('yyyymm');
  const vcId = Number(c.req.param('vibecoderId'));
  const body = await c.req.json().catch(() => null);
  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request', issues: parsed.error.issues }, 400);

  const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, vcId));
  if (!vc) return c.json({ error: 'vibecoder_not_found' }, 404);

  // Ensure row exists
  await persistAutoScore(vcId, ym);
  const [score] = await db
    .select()
    .from(s.monthlyScores)
    .where(and(eq(s.monthlyScores.vibecoderId, vcId), eq(s.monthlyScores.yearMonth, ym)));
  if (!score) return c.json({ error: 'no_score_row' }, 500);
  if (score.lockedAt) return c.json({ error: 'locked' }, 409);

  const updated = { ...score, ...parsed.data };
  updated.total =
    updated.disciplineReporting +
    updated.deadlineOwnership +
    updated.uxuiTaste +
    updated.businessThinking +
    updated.professionalLearning +
    updated.simpleExplanation;
  const tier = tierForTotal(updated.total);
  const bonus = bonusAmount(updated.total, Number(vc.bonusBaselineUzs));
  const performanceDiscussionRequired = updated.total < 60;

  const [saved] = await db
    .update(s.monthlyScores)
    .set({
      disciplineReporting: updated.disciplineReporting,
      deadlineOwnership: updated.deadlineOwnership,
      uxuiTaste: updated.uxuiTaste,
      businessThinking: updated.businessThinking,
      professionalLearning: updated.professionalLearning,
      simpleExplanation: updated.simpleExplanation,
      total: updated.total,
      bonusTier: tier,
      bonusPaidUzs: bonus,
      performanceDiscussionRequired,
      pmNotes: parsed.data.pmNotes ?? score.pmNotes,
    })
    .where(eq(s.monthlyScores.id, score.id))
    .returning();
  return c.json({ ...saved, bonusPaidUzs: Number(saved?.bonusPaidUzs ?? 0) });
});

scoreRoutes.post('/:yyyymm/:vibecoderId/lock', async (c) => {
  const ym = c.req.param('yyyymm');
  const vcId = Number(c.req.param('vibecoderId'));
  const [score] = await db
    .select()
    .from(s.monthlyScores)
    .where(and(eq(s.monthlyScores.vibecoderId, vcId), eq(s.monthlyScores.yearMonth, ym)));
  if (!score) return c.json({ error: 'not_found' }, 404);
  if (score.lockedAt) return c.json({ error: 'already_locked' }, 409);
  const [locked] = await db
    .update(s.monthlyScores)
    .set({ lockedAt: new Date() })
    .where(eq(s.monthlyScores.id, score.id))
    .returning();
  return c.json(locked);
});

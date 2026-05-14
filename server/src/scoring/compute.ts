import { and, eq, gte, lte, sql, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { COMPONENT_AUTO_MAX, FORMULAS, clamp, type ComponentKey } from './formulas.js';

function monthBounds(yearMonth: string): { start: string; end: string; workingDays: number } {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const end = new Date(Date.UTC(y!, m!, 0)); // last day
  // working days Mon-Sat = 6/7 of month
  let working = 0;
  for (let d = 1; d <= end.getUTCDate(); d++) {
    const dow = new Date(Date.UTC(y!, m! - 1, d)).getUTCDay();
    if (dow !== 0) working++; // skip Sunday
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), workingDays: working };
}

export interface AutoScore {
  disciplineReporting: number;
  deadlineOwnership: number;
  uxuiTaste: number;
  businessThinking: number;
  professionalLearning: number;
  simpleExplanation: number;
  total: number;
  counts: {
    workingDays: number;
    onTimeReports: number;
    lateReports: number;
    missedReports: number;
    briefs: number;
    deliveries: number;
    onTimeDeliveries: number;
    designRefs: number;
    designRefsValid: number;
    businessNotes: number;
    learningNotes: number;
    explainNotes: number;
  };
}

export async function computeScoreForMonth(vibecoderId: number, yearMonth: string): Promise<AutoScore> {
  const { start, end, workingDays } = monthBounds(yearMonth);

  // Reports
  const reportRows = await db
    .select()
    .from(s.dailyReports)
    .where(
      and(
        eq(s.dailyReports.vibecoderId, vibecoderId),
        gte(s.dailyReports.reportDate, start),
        lte(s.dailyReports.reportDate, end),
      ),
    );
  const onTimeReports = reportRows.filter((r) => r.status === 'on_time').length;
  const lateReports = reportRows.filter((r) => r.status === 'late').length;
  const missedReports = Math.max(0, workingDays - reportRows.length);

  // Briefs + deliveries
  const briefs = await db
    .select()
    .from(s.taskOwnershipBriefs)
    .where(
      and(
        eq(s.taskOwnershipBriefs.vibecoderId, vibecoderId),
        gte(s.taskOwnershipBriefs.createdAt, new Date(`${start}T00:00:00Z`)),
        lte(s.taskOwnershipBriefs.createdAt, new Date(`${end}T23:59:59Z`)),
      ),
    );
  const completed = briefs.filter((b) => b.completedAt);
  const onTimeDeliveries = briefs.filter((b) => b.onTime === true).length;

  // Growth logs
  const designRows = await db
    .select()
    .from(s.designRefs)
    .where(
      and(
        eq(s.designRefs.vibecoderId, vibecoderId),
        gte(s.designRefs.createdAt, new Date(`${start}T00:00:00Z`)),
        lte(s.designRefs.createdAt, new Date(`${end}T23:59:59Z`)),
      ),
    );
  const designValid = designRows.filter((r) => Array.isArray(r.observations) && (r.observations as unknown[]).length >= 3);

  const businessRows = await db
    .select({ id: s.businessNotes.id })
    .from(s.businessNotes)
    .where(
      and(
        eq(s.businessNotes.vibecoderId, vibecoderId),
        gte(s.businessNotes.createdAt, new Date(`${start}T00:00:00Z`)),
        lte(s.businessNotes.createdAt, new Date(`${end}T23:59:59Z`)),
      ),
    );

  const learningRows = await db
    .select({ id: s.learningNotes.id })
    .from(s.learningNotes)
    .where(
      and(
        eq(s.learningNotes.vibecoderId, vibecoderId),
        gte(s.learningNotes.createdAt, new Date(`${start}T00:00:00Z`)),
        lte(s.learningNotes.createdAt, new Date(`${end}T23:59:59Z`)),
      ),
    );

  const explainRows = await db
    .select({ id: s.explainNotes.id })
    .from(s.explainNotes)
    .where(
      and(
        eq(s.explainNotes.vibecoderId, vibecoderId),
        gte(s.explainNotes.createdAt, new Date(`${start}T00:00:00Z`)),
        lte(s.explainNotes.createdAt, new Date(`${end}T23:59:59Z`)),
      ),
    );

  // Formulas (clamped)
  const wd = Math.max(workingDays, 1);

  const disciplineReporting = Math.round(
    clamp(7 * (onTimeReports / wd), 0, 7) + clamp(3 * ((onTimeReports + lateReports) / wd), 0, 3),
  );

  // briefs_with_understanding: any brief w/ non-empty understanding counts
  const briefsWithUnderstanding = briefs.filter((b) => (b.understanding ?? '').trim().length >= 20).length;
  const deadlineOwnership = Math.round(
    clamp(10 * (briefsWithUnderstanding / Math.max(briefs.length, 1)), 0, 10) +
      clamp(5 * (onTimeDeliveries / Math.max(completed.length, 1)), 0, 5),
  );

  const uxuiTaste = Math.round(clamp(10 * Math.min(1, designValid.length / wd), 0, 10));
  const businessThinking = Math.round(clamp(10 * Math.min(1, businessRows.length / 4), 0, 10));
  const professionalLearning = Math.round(clamp(8 * Math.min(1, learningRows.length / wd), 0, 8));
  const simpleExplanation = Math.round(clamp(4 * Math.min(1, explainRows.length / 4), 0, 4));

  const total =
    disciplineReporting +
    deadlineOwnership +
    uxuiTaste +
    businessThinking +
    professionalLearning +
    simpleExplanation;

  return {
    disciplineReporting,
    deadlineOwnership,
    uxuiTaste,
    businessThinking,
    professionalLearning,
    simpleExplanation,
    total,
    counts: {
      workingDays,
      onTimeReports,
      lateReports,
      missedReports,
      briefs: briefs.length,
      deliveries: completed.length,
      onTimeDeliveries,
      designRefs: designRows.length,
      designRefsValid: designValid.length,
      businessNotes: businessRows.length,
      learningNotes: learningRows.length,
      explainNotes: explainRows.length,
    },
  };
}

/** Persist auto values into monthly_scores + score_components (creates row if not exists, doesn't touch manual overrides). */
export async function persistAutoScore(vibecoderId: number, yearMonth: string): Promise<number> {
  const auto = await computeScoreForMonth(vibecoderId, yearMonth);

  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(s.monthlyScores)
      .where(and(eq(s.monthlyScores.vibecoderId, vibecoderId), eq(s.monthlyScores.yearMonth, yearMonth)));
    if (existing?.lockedAt) return existing.id;

    const [score] = await tx
      .insert(s.monthlyScores)
      .values({
        vibecoderId,
        yearMonth,
        disciplineReporting: auto.disciplineReporting,
        deadlineOwnership: auto.deadlineOwnership,
        uxuiTaste: auto.uxuiTaste,
        businessThinking: auto.businessThinking,
        professionalLearning: auto.professionalLearning,
        simpleExplanation: auto.simpleExplanation,
        total: auto.total,
      })
      .onConflictDoUpdate({
        target: [s.monthlyScores.vibecoderId, s.monthlyScores.yearMonth],
        set: {
          disciplineReporting: auto.disciplineReporting,
          deadlineOwnership: auto.deadlineOwnership,
          uxuiTaste: auto.uxuiTaste,
          businessThinking: auto.businessThinking,
          professionalLearning: auto.professionalLearning,
          simpleExplanation: auto.simpleExplanation,
          total: auto.total,
        },
      })
      .returning();

    const components: Array<{ key: ComponentKey; value: number }> = [
      { key: 'discipline_reporting', value: auto.disciplineReporting },
      { key: 'deadline_ownership', value: auto.deadlineOwnership },
      { key: 'uxui_taste', value: auto.uxuiTaste },
      { key: 'business_thinking', value: auto.businessThinking },
      { key: 'professional_learning', value: auto.professionalLearning },
      { key: 'simple_explanation', value: auto.simpleExplanation },
    ];
    // Replace components rows
    await tx.delete(s.scoreComponents).where(eq(s.scoreComponents.monthlyScoreId, score!.id));
    for (const c of components) {
      await tx.insert(s.scoreComponents).values({
        monthlyScoreId: score!.id,
        component: c.key,
        autoValue: c.value,
        manualOverride: null,
        finalValue: c.value,
        formulaSnapshot: FORMULAS[c.key],
        notes: `counts: ${JSON.stringify(auto.counts)}`,
      });
    }
    return score!.id;
  });
}

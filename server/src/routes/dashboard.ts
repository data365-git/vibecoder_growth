import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';

export const dashboardRoutes = new Hono();
dashboardRoutes.use('*', requireAdmin);

dashboardRoutes.get('/team', async (c) => {
  const vcs = await db.select().from(s.vibecoders).where(eq(s.vibecoders.active, true));
  return c.json({
    rows: vcs.map((vc) => ({
      vibecoderId: vc.id,
      fullNameRu: vc.fullNameRu,
      role: vc.role,
      avatar: vc.fullNameRu.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join(''),
      todayPercent: 0,
      periodPercent: 0,
      monthlyScore: 0,
      bonusTier: '0%',
      bonusEarnedUzs: 0,
      predictedBonusUzs: 0,
      riskStatus: 'pending',
      missedCount: 0,
      lateCount: 0,
      trend: 'flat',
    })),
  });
});

dashboardRoutes.get('/employee/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);
  const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, id)).limit(1);
  if (!vc) return c.json({ error: 'not_found' }, 404);
  return c.json({
    vibecoder: {
      id: vc.id,
      name: vc.fullNameRu,
      role: vc.role,
      avatar: vc.fullNameRu.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join(''),
      bonusBaselineUzs: vc.bonusBaselineUzs ?? 0,
    },
    period: {
      periodPercent: 0,
      monthlyScore: 0,
      bonusTier: '0%',
      workingDaysTotal: 22,
      workingDaysPassed: 12,
      liveBonusValueUzs: 0,
      accruedBonusUzs: 0,
      predictedFinalBonusUzs: 0,
      predictedFinalScore: 0,
      riskStatus: 'pending',
    },
    categoryBreakdown: [],
    nextActions: [],
    manualAdjustments: [],
    calendar: {},
  });
});

dashboardRoutes.get('/employee/:id/day/:ymd', async (c) => {
  const id = Number(c.req.param('id'));
  const ymd = c.req.param('ymd');
  if (!Number.isInteger(id) || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return c.json({ error: 'bad_input' }, 400);
  }
  return c.json({
    date: ymd,
    dailyPercent: 0,
    activePoints: 0,
    completed: 0,
    missed: 0,
    late: 0,
    items: [],
  });
});

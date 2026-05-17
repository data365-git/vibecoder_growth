import { Hono } from 'hono';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';

export const dashboardRoutes = new Hono();
dashboardRoutes.use('*', requireAdmin);

type Pillar =
  | 'discipline_reporting'
  | 'uxui_taste'
  | 'business_thinking'
  | 'professional_learning'
  | 'simple_explanation'
  | 'deadline_ownership';

const PILLAR_TARGETS: Record<Pillar, number> = {
  discipline_reporting: 10,
  uxui_taste: 20,
  business_thinking: 20,
  professional_learning: 15,
  simple_explanation: 10,
  deadline_ownership: 25,
};

const PILLARS: Pillar[] = [
  'discipline_reporting',
  'uxui_taste',
  'business_thinking',
  'professional_learning',
  'simple_explanation',
  'deadline_ownership',
];

// Working days follow the bot's Пн–Сб schedule — Sundays are skipped. Date
// strings here are UTC-based YYYY-MM-DD; the calendar grid does not depend
// on a particular timezone for week-day arithmetic.
function isWorkingDay(d: Date): boolean {
  // getUTCDay(): 0 = Sunday, 1..6 = Mon..Sat
  return d.getUTCDay() !== 0;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseYmd(input: string): Date {
  // Force UTC midnight so day arithmetic doesn't drift across DST.
  const parts = input.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(y, m - 1, day));
}

function workingDaysInMonth(year: number, monthIdx0: number): number {
  const last = new Date(Date.UTC(year, monthIdx0 + 1, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= last; day++) {
    if (isWorkingDay(new Date(Date.UTC(year, monthIdx0, day)))) count++;
  }
  return count;
}

function workingDaysElapsed(year: number, monthIdx0: number, throughDay: number): number {
  let count = 0;
  for (let day = 1; day <= throughDay; day++) {
    if (isWorkingDay(new Date(Date.UTC(year, monthIdx0, day)))) count++;
  }
  return count;
}

dashboardRoutes.get('/', async (c) => {
  const dateParam = c.req.query('date');
  const dateStr = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : ymd(new Date());
  const target = parseYmd(dateStr);
  const year = target.getUTCFullYear();
  const monthIdx0 = target.getUTCMonth();
  const day = target.getUTCDate();

  const monthStart = new Date(Date.UTC(year, monthIdx0, 1));
  const monthStartStr = ymd(monthStart);
  // We only sum data up through `dateStr` (inclusive), not the rest of the
  // month — future days haven't happened yet, and counting them would
  // pre-credit nothing useful. The cap-per-pillar logic still applies.
  const upToStr = dateStr;
  const yearMonth = `${year}-${String(monthIdx0 + 1).padStart(2, '0')}`;

  const wdInMonth = workingDaysInMonth(year, monthIdx0);
  const wdElapsed = workingDaysElapsed(year, monthIdx0, day);

  // 1) Active employees
  const employees = await db
    .select()
    .from(s.vibecoders)
    .where(eq(s.vibecoders.active, true));
  const employeeIds = employees.map((e) => e.id);

  // 2) Habit marks for the active employees this month-to-date
  const habitRows = employeeIds.length
    ? await db
        .select()
        .from(s.habitMarks)
        .where(
          and(
            inArray(s.habitMarks.vibecoderId, employeeIds),
            gte(s.habitMarks.markDate, monthStartStr),
            lte(s.habitMarks.markDate, upToStr),
          ),
        )
    : [];

  // 3) Daily reports for the active employees this month-to-date
  const reportRows = employeeIds.length
    ? await db
        .select({
          vibecoderId: s.dailyReports.vibecoderId,
          reportDate: s.dailyReports.reportDate,
          status: s.dailyReports.status,
        })
        .from(s.dailyReports)
        .where(
          and(
            inArray(s.dailyReports.vibecoderId, employeeIds),
            gte(s.dailyReports.reportDate, monthStartStr),
            lte(s.dailyReports.reportDate, upToStr),
            inArray(s.dailyReports.status, ['on_time', 'late']),
          ),
        )
    : [];

  // Index for fast joins ---------------------------------------------------
  // habit done counts per (vibecoderId, pillar) and per-day done set
  const habitDoneCountByVcPillar = new Map<string, number>();
  const habitDoneCellByVcDatePillar = new Set<string>();
  for (const r of habitRows) {
    if (r.status !== 'done') continue;
    const pillar = r.pillar as Pillar;
    const k1 = `${r.vibecoderId}|${pillar}`;
    habitDoneCountByVcPillar.set(k1, (habitDoneCountByVcPillar.get(k1) ?? 0) + 1);
    habitDoneCellByVcDatePillar.add(`${r.vibecoderId}|${r.markDate}|${pillar}`);
  }

  // discipline counts per vibecoderId and per-day discipline set
  const disciplineCountByVc = new Map<number, number>();
  const disciplineCellByVcDate = new Set<string>();
  for (const r of reportRows) {
    disciplineCountByVc.set(r.vibecoderId, (disciplineCountByVc.get(r.vibecoderId) ?? 0) + 1);
    disciplineCellByVcDate.add(`${r.vibecoderId}|${r.reportDate}`);
  }

  // Build response employees -----------------------------------------------
  const ratio = wdInMonth > 0 ? wdElapsed / wdInMonth : 0;
  const responseEmployees = employees
    .map((e) => {
      const perPillar = {} as Record<Pillar, { done: number; target: number }>;
      let monthlyDone = 0;
      for (const pillar of PILLARS) {
        const target = PILLAR_TARGETS[pillar];
        const raw =
          pillar === 'discipline_reporting'
            ? (disciplineCountByVc.get(e.id) ?? 0)
            : (habitDoneCountByVcPillar.get(`${e.id}|${pillar}`) ?? 0);
        const capped = Math.min(raw, target);
        perPillar[pillar] = { done: capped, target };
        monthlyDone += capped;
      }
      const monthlyRate = monthlyDone / 100;
      const baseSalaryUzs = Number(e.baseSalaryUzs);
      const bonusBaselineUzs = Number(e.bonusBaselineUzs);
      const bonusEarnedUzs = Math.round(bonusBaselineUzs * monthlyRate * ratio);
      const bonusPredictedUzs = Math.round(bonusBaselineUzs * monthlyRate);
      return {
        vibecoderId: e.id,
        fullNameRu: e.fullNameRu,
        tgUsername: e.tgUsername ?? null,
        role: e.role,
        baseSalaryUzs,
        bonusBaselineUzs,
        timezone: e.timezone,
        active: e.active,
        monthlyDone,
        monthlyRate,
        bonusEarnedUzs,
        bonusPredictedUzs,
        perPillar,
      };
    })
    .sort((a, b) => a.fullNameRu.localeCompare(b.fullNameRu, 'ru'));

  // Today completion -------------------------------------------------------
  const total = employees.length * PILLARS.length;
  let doneCells = 0;
  for (const e of employees) {
    for (const pillar of PILLARS) {
      const isDone =
        pillar === 'discipline_reporting'
          ? disciplineCellByVcDate.has(`${e.id}|${dateStr}`)
          : habitDoneCellByVcDatePillar.has(`${e.id}|${dateStr}|${pillar}`);
      if (isDone) doneCells++;
    }
  }
  const percent = total === 0 ? 0 : Math.round((doneCells / total) * 100);

  return c.json({
    date: dateStr,
    yearMonth,
    workingDaysInMonth: wdInMonth,
    workingDaysElapsed: wdElapsed,
    todayCompletion: { done: doneCells, total, percent },
    employees: responseEmployees,
  });
});

import cron from 'node-cron';
import type { Bot } from 'grammy';
import { eq, and, gte } from 'drizzle-orm';
import { db } from './db/client.js';
import * as s from './db/schema/growth.js';
import { env } from './env.js';
import { persistAutoScore } from './scoring/compute.js';
import type { BotContext } from './bot/types.js';

const TZ = env.TZ;

function todayYmd(): string {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ })).toISOString().slice(0, 10);
}

async function activeVibecoders() {
  return db.select().from(s.vibecoders).where(eq(s.vibecoders.active, true));
}

async function dmAll(
  bot: Bot<BotContext>,
  msg: string,
  opts?: {
    filter?: (vc: typeof s.vibecoders.$inferSelect) => boolean;
    kind?: typeof s.reminderKindEnum.enumValues[number];
  },
) {
  const vcs = await activeVibecoders();
  for (const vc of vcs) {
    if (!vc.tgUserId) continue;
    if (opts?.filter && !opts.filter(vc)) continue;
    try {
      const sent = await bot.api.sendMessage(Number(vc.tgUserId), msg);
      if (opts?.kind) {
        await db.insert(s.botReminders).values({
          vibecoderId: vc.id,
          kind: opts.kind,
          scheduledFor: new Date(),
          sentAt: new Date(),
          messageId: BigInt(sent.message_id),
        });
      }
    } catch (err) {
      console.error(`dm fail for ${vc.id}:`, err);
    }
  }
}

async function dmIf(
  bot: Bot<BotContext>,
  vc: typeof s.vibecoders.$inferSelect,
  msg: string,
  kind: typeof s.reminderKindEnum.enumValues[number],
) {
  if (!vc.tgUserId) return;
  try {
    const sent = await bot.api.sendMessage(Number(vc.tgUserId), msg);
    await db.insert(s.botReminders).values({
      vibecoderId: vc.id,
      kind,
      scheduledFor: new Date(),
      sentAt: new Date(),
      messageId: BigInt(sent.message_id),
    });
  } catch (e) {
    /* noop */
  }
}

export function startScheduler(bot: Bot<BotContext>) {
  // 09:00 Mon-Sat — stand-up reminder
  cron.schedule(
    '0 9 * * 1-6',
    async () => {
      await dmAll(bot, '☀️ Доброе утро! /standup — 5 коротких вопросов перед началом дня.', { kind: 'standup' });
    },
    { timezone: TZ },
  );

  // 12:00 Mon-Sat — soft report nudge (only if no report yet)
  cron.schedule(
    '0 12 * * 1-6',
    async () => {
      const ymd = todayYmd();
      const vcs = await activeVibecoders();
      const reports = await db.select().from(s.dailyReports).where(eq(s.dailyReports.reportDate, ymd));
      const submittedIds = new Set(reports.filter((r) => r.submittedAt).map((r) => r.vibecoderId));
      for (const vc of vcs) {
        if (submittedIds.has(vc.id)) continue;
        await dmIf(bot, vc, '💡 Напоминание: до 18:00 нужно отправить /report.', 'report_soft');
      }
    },
    { timezone: TZ },
  );

  // 17:30 Mon-Sat — final nudge
  cron.schedule(
    '30 17 * * 1-6',
    async () => {
      const ymd = todayYmd();
      const vcs = await activeVibecoders();
      const reports = await db.select().from(s.dailyReports).where(eq(s.dailyReports.reportDate, ymd));
      const submittedIds = new Set(reports.filter((r) => r.submittedAt).map((r) => r.vibecoderId));
      for (const vc of vcs) {
        if (submittedIds.has(vc.id)) continue;
        await dmIf(bot, vc, '⏰ Осталось 30 минут до закрытия окна. /report сейчас.', 'report_final');
      }
    },
    { timezone: TZ },
  );

  // 18:00 Mon-Sat — close window, mark missed, post summary to PM channel
  cron.schedule(
    '0 18 * * 1-6',
    async () => {
      const ymd = todayYmd();
      const vcs = await activeVibecoders();
      const reports = await db.select().from(s.dailyReports).where(eq(s.dailyReports.reportDate, ymd));
      const submitted = new Map(reports.map((r) => [r.vibecoderId, r] as const));
      // Insert missed rows for vibecoders without any report
      for (const vc of vcs) {
        if (!submitted.has(vc.id)) {
          await db
            .insert(s.dailyReports)
            .values({
              vibecoderId: vc.id,
              reportDate: ymd,
              didToday: '',
              completed: null,
              inProgress: null,
              blockers: null,
              plansTomorrow: '',
              proofLinks: [],
              keptPromise: null,
              status: 'missed',
            })
            .onConflictDoNothing();
        }
      }
      // Daily totals message — goes to the same group that holds the
      // rolling per-person cards, so the manager sees today's bottom line
      // in one place. Legacy GROWTH_REPORTING_CHAT_ID still works as a
      // fallback for installs that haven't migrated yet.
      const summaryChat = env.GROWTH_GROUP_CHAT_ID ?? env.GROWTH_REPORTING_CHAT_ID;
      if (summaryChat) {
        const onTime = [...submitted.values()].filter((r) => r.status === 'on_time').length;
        const late = [...submitted.values()].filter((r) => r.status === 'late').length;
        const missing = vcs.length - submitted.size;
        const summary = `📊 Daily summary · ${ymd}\nOn-time: ${onTime}\nLate: ${late}\nMissed: ${missing}\nИтого активных: ${vcs.length}`;
        try {
          await bot.api.sendMessage(summaryChat, summary);
        } catch (e) {
          /* noop */
        }
      }
    },
    { timezone: TZ },
  );

  // Every 2 hours Mon-Sat 10/12/14/16 (Tashkent) — nudge anyone who
  // hasn't sent a /status in the last 90 minutes during the work day.
  // The offline-mode gate is gone: the bot is the source of truth for
  // what's happening, so we want a steady cadence regardless.
  cron.schedule(
    '0 10,12,14,16 * * 1-6',
    async () => {
      const since = new Date(Date.now() - 90 * 60_000);
      const vcs = await activeVibecoders();
      for (const vc of vcs) {
        const recent = await db
          .select({ id: s.statusUpdates.id })
          .from(s.statusUpdates)
          .where(and(eq(s.statusUpdates.vibecoderId, vc.id), gte(s.statusUpdates.sentAt, since)))
          .limit(1);
        if (recent.length > 0) continue;
        await dmIf(bot, vc, '⚡ /status — 5 коротких вопросов. Я опубликую в топик Status.', 'status_offline');
      }
    },
    { timezone: TZ },
  );

  // 10:00 / 14:00 / 18:00 Mon-Sat — lead summary DM. Same shape as the
  // /today command; pushed automatically so the lead doesn't have to ask.
  cron.schedule(
    '0 10,14,18 * * 1-6',
    async () => {
      const ymd = todayYmd();
      const vcs = await activeVibecoders();
      const reports = await db.select().from(s.dailyReports).where(eq(s.dailyReports.reportDate, ymd));
      let onTime = 0, late = 0, pending = 0;
      const missingNames: string[] = [];
      for (const vc of vcs) {
        const r = reports.find((x) => x.vibecoderId === vc.id);
        if (!r || !r.submittedAt) {
          pending++;
          missingNames.push(vc.fullNameRu);
        } else if (r.status === 'on_time') onTime++;
        else if (r.status === 'late') late++;
      }
      const text = [
        `📅 ${ymd}`,
        `On-time: ${onTime}`,
        `Late: ${late}`,
        `Pending: ${pending} / ${vcs.length}`,
        pending > 0 ? `Missing: ${missingNames.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const managers = await db.select().from(s.growthManagers);
      for (const m of managers) {
        if (!m.tgUserId) continue;
        try {
          await bot.api.sendMessage(Number(m.tgUserId), text);
        } catch {
          /* noop */
        }
      }
    },
    { timezone: TZ },
  );

  // Sunday 18:00 — weekly review reminder to managers
  cron.schedule(
    '0 18 * * 0',
    async () => {
      const managers = await db.select().from(s.growthManagers);
      for (const m of managers) {
        if (!m.tgUserId) continue;
        try {
          await bot.api.sendMessage(
            Number(m.tgUserId),
            '📅 Воскресенье: пора провести weekly growth review. Открой admin UI → Weekly.',
          );
        } catch (e) {
          /* noop */
        }
      }
      // Audit row per active vibecoder (whose review is upcoming)
      const vcs = await activeVibecoders();
      for (const vc of vcs) {
        await db.insert(s.botReminders).values({
          vibecoderId: vc.id,
          kind: 'weekly_review',
          scheduledFor: new Date(),
          sentAt: new Date(),
        });
      }
    },
    { timezone: TZ },
  );

  // 1st of next month at 09:00 — recompute auto scores for last month
  cron.schedule(
    '0 9 1 * *',
    async () => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      const vcs = await activeVibecoders();
      for (const vc of vcs) {
        await persistAutoScore(vc.id, ym);
      }
      // Notify managers
      const managers = await db.select().from(s.growthManagers);
      for (const m of managers) {
        if (!m.tgUserId) continue;
        try {
          await bot.api.sendMessage(
            Number(m.tgUserId),
            `📊 Auto scores за ${ym} рассчитаны. Открой admin UI → Scores → ${ym} для финализации.`,
          );
        } catch (e) {
          /* noop */
        }
      }
    },
    { timezone: TZ },
  );

  console.log(`[scheduler] all jobs registered (TZ=${TZ})`);
}

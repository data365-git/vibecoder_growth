import { Bot, session, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { eq, and, sql, isNull, gte, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { env } from '../env.js';
import { t } from './i18n.ru.js';
import type { BotContext, SessionData } from './types.js';
import { PgSessionStorage } from './session-storage.js';
import { resolveIdentity } from './middlewares/auth.js';
import { mainMenu, managerMenu } from './keyboards.js';
import { reportConversation } from './wizards/report.js';
import { standupConversation } from './wizards/standup.js';
import { statusConversation } from './wizards/status.js';
import { designConversation } from './wizards/design.js';
import { businessConversation } from './wizards/business.js';
import { learningConversation } from './wizards/learning.js';
import { explainConversation } from './wizards/explain.js';
import { bookConversation } from './wizards/book.js';
import { briefConversation } from './wizards/brief.js';
import { deliveryConversation } from './wizards/delivery.js';
import { startOfflineMode, endOfflineMode } from './wizards/offline.js';
import { computeScoreForMonth } from '../scoring/compute.js';

export function createBot(): Bot<BotContext> {
  if (!env.GROWTH_BOT_TOKEN) throw new Error('GROWTH_BOT_TOKEN not set');
  const bot = new Bot<BotContext>(env.GROWTH_BOT_TOKEN);

  bot.use(
    session<SessionData, BotContext>({
      initial: () => ({}),
      storage: new PgSessionStorage<SessionData>(),
    }),
  );
  bot.use(conversations());
  bot.use(resolveIdentity);

  // Register conversations
  bot.use(createConversation(reportConversation, 'report'));
  bot.use(createConversation(standupConversation, 'standup'));
  bot.use(createConversation(statusConversation, 'status'));
  bot.use(createConversation(designConversation, 'design'));
  bot.use(createConversation(businessConversation, 'business'));
  bot.use(createConversation(learningConversation, 'learning'));
  bot.use(createConversation(explainConversation, 'explain'));
  bot.use(createConversation(bookConversation, 'book'));
  bot.use(createConversation(briefConversation, 'brief'));
  bot.use(
    createConversation(
      (conv: any, ctx: BotContext) => deliveryConversation(conv, ctx, (ctx as any)._deliveryBriefId ?? 0),
      'delivery',
    ),
  );

  // /start — onboarding / link by username if not linked
  bot.command('start', async (ctx) => {
    if (ctx.vibecoderId) {
      const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, ctx.vibecoderId));
      await ctx.reply(t.linked(vc?.fullNameRu ?? ''), { reply_markup: ctx.isManager ? managerMenu : mainMenu });
      return;
    }
    const username = ctx.from?.username?.toLowerCase();
    if (username) {
      const [vc] = await db
        .select()
        .from(s.vibecoders)
        .where(and(eq(sql`lower(${s.vibecoders.tgUsername})`, username), eq(s.vibecoders.active, true)));
      if (vc) {
        await db.update(s.vibecoders).set({ tgUserId: BigInt(ctx.from!.id) }).where(eq(s.vibecoders.id, vc.id));
        ctx.vibecoderId = vc.id;
        await ctx.reply(t.linked(vc.fullNameRu), { reply_markup: mainMenu });
        return;
      }
    }
    await ctx.reply(t.notLinked);
  });

  bot.command('help', async (ctx) => {
    if (ctx.vibecoderId) {
      const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, ctx.vibecoderId));
      await ctx.reply(t.linked(vc?.fullNameRu ?? ''));
    } else {
      await ctx.reply(t.notLinked);
    }
  });

  bot.command('cancel', async (ctx) => {
    await ctx.conversation.exitAll();
    await ctx.reply(t.cancel);
  });

  // Vibecoder commands
  const enter = (name: string) => async (ctx: BotContext) => {
    if (!ctx.vibecoderId) return ctx.reply(t.notLinked);
    await ctx.conversation.enter(name);
  };
  bot.command('report', enter('report'));
  bot.command('standup', enter('standup'));
  bot.command('status', enter('status'));
  bot.command('design', enter('design'));
  bot.command('business', enter('business'));
  bot.command('learning', enter('learning'));
  bot.command('explain', enter('explain'));
  bot.command('book', enter('book'));
  bot.command('brief', enter('brief'));

  bot.command('delivery', async (ctx) => {
    if (!ctx.vibecoderId) return ctx.reply(t.notLinked);
    const arg = (ctx.match ?? '').toString().trim();
    const briefId = Number(arg);
    if (!Number.isFinite(briefId) || briefId <= 0) {
      return ctx.reply('Использование: /delivery <briefId>');
    }
    (ctx as any)._deliveryBriefId = briefId;
    await ctx.conversation.enter('delivery');
  });

  bot.command('myscore', async (ctx) => {
    if (!ctx.vibecoderId) return ctx.reply(t.notLinked);
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const auto = await computeScoreForMonth(ctx.vibecoderId, ym);
    const lines = [
      `📊 Прогноз score за ${ym} (auto):`,
      `Discipline & Reporting: ${auto.disciplineReporting} / 10`,
      `Deadline & Ownership: ${auto.deadlineOwnership} / 25`,
      `UX/UI Taste: ${auto.uxuiTaste} / 20`,
      `Business Thinking: ${auto.businessThinking} / 20`,
      `Professional Learning: ${auto.professionalLearning} / 15`,
      `Simple Explanation: ${auto.simpleExplanation} / 10`,
      `—`,
      `Итого: ${auto.total} / 100`,
      `Финальный score выставит PM в конце месяца.`,
    ];
    await ctx.reply(lines.join('\n'));
  });

  // Manager commands
  bot.command('offline', async (ctx) => startOfflineMode(ctx, ctx.match?.toString()));
  bot.command('online', async (ctx) => endOfflineMode(ctx));

  bot.command('today', async (ctx) => {
    if (!ctx.isManager) return ctx.reply(t.noPermission);
    const ymd = new Date().toISOString().slice(0, 10);
    const reports = await db.select().from(s.dailyReports).where(eq(s.dailyReports.reportDate, ymd));
    const vcs = await db.select().from(s.vibecoders).where(eq(s.vibecoders.active, true));
    let onTime = 0, late = 0, missed = 0, none = 0;
    for (const vc of vcs) {
      const r = reports.find((x) => x.vibecoderId === vc.id);
      if (!r || !r.submittedAt) none++;
      else if (r.status === 'on_time') onTime++;
      else if (r.status === 'late') late++;
      else missed++;
    }
    await ctx.reply(
      `📅 ${ymd}\nOn-time: ${onTime}\nLate: ${late}\nPending/Missed: ${none + missed} of ${vcs.length}`,
    );
  });

  bot.command('weekreview', async (ctx) => {
    if (!ctx.isManager) return ctx.reply(t.noPermission);
    await ctx.reply('Открой admin UI → /admin/growth/weekly чтобы подготовить weekly review.');
  });

  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) console.error('Telegram API error:', e.description);
    else if (e instanceof HttpError) console.error('HTTP error:', e);
    else console.error('Bot error:', e);
  });

  return bot;
}

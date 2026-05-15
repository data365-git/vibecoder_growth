import { Bot, session, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { eq, and, sql, isNull } from 'drizzle-orm';
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
import { briefConversation } from './wizards/brief.js';
import { deliveryConversation } from './wizards/delivery.js';
import { startOfflineMode, endOfflineMode } from './wizards/offline.js';

// One-line descriptions shown in the Telegram client's command picker
// (the menu that pops up when a user types "/"). Keep them short and
// action-oriented so a new vibecoder can self-onboard without docs.
const COMMAND_DESCRIPTIONS: Array<{ command: string; description: string }> = [
  { command: 'standup', description: 'Утренний план — 5 вопросов' },
  { command: 'status', description: 'Короткий статус — над чем работаешь сейчас' },
  { command: 'report', description: 'Отчёт за день (до 18:00)' },
  { command: 'brief', description: 'Взять задачу + self-deadline' },
  { command: 'delivery', description: 'Закрыть brief (формат: /delivery <id>)' },
  { command: 'cancel', description: 'Отменить текущий wizard' },
  { command: 'help', description: 'Подсказка по командам' },
];

export function createBot(): Bot<BotContext> {
  if (!env.GROWTH_BOT_TOKEN) throw new Error('GROWTH_BOT_TOKEN not set');
  const bot = new Bot<BotContext>(env.GROWTH_BOT_TOKEN);

  // Register command suggestions in Telegram's UI. Fire-and-forget — if
  // Telegram is briefly unreachable it's not worth crashing startup over.
  bot.api.setMyCommands(COMMAND_DESCRIPTIONS).catch((e) => {
    console.warn('[bot] setMyCommands failed:', e);
  });

  bot.use(
    session<SessionData, BotContext>({
      initial: () => ({}),
      storage: new PgSessionStorage<SessionData>(),
    }),
  );
  // resolveIdentity MUST run before conversations() so that during a
  // conversation replay (when grammy re-runs a wizard function from the
  // top after the bot restarted), ctx.vibecoderId is populated. If the
  // order were reversed, replay would see ctx.vibecoderId === undefined
  // and the wizard would either crash on a NOT NULL insert (pre-guard)
  // or exit early on every replay (post-guard, still broken UX).
  bot.use(resolveIdentity);
  bot.use(conversations());

  // Discipline-only conversations. The 5 manual-pillar wizards (design,
  // business, learning, explain, book) stay in the codebase but are not
  // registered — humans review those manually for now.
  bot.use(createConversation(reportConversation, 'report'));
  bot.use(createConversation(standupConversation, 'standup'));
  bot.use(createConversation(statusConversation, 'status'));
  bot.use(createConversation(briefConversation, 'brief'));
  bot.use(createConversation(deliveryConversation, 'delivery'));

  // /start — onboarding / link by username if not linked.
  bot.command('start', async (ctx) => {
    const username = ctx.from?.username?.toLowerCase();
    const tgId = ctx.from?.id;

    if (username && tgId && !ctx.managerId) {
      const [mgr] = await db
        .select()
        .from(s.growthManagers)
        .where(and(eq(sql`lower(${s.growthManagers.tgUsername})`, username), isNull(s.growthManagers.tgUserId)));
      if (mgr) {
        await db.update(s.growthManagers).set({ tgUserId: BigInt(tgId) }).where(eq(s.growthManagers.id, mgr.id));
        ctx.managerId = mgr.id;
        ctx.isManager = true;
      }
    }

    if (username && tgId && !ctx.vibecoderId) {
      const [vc] = await db
        .select()
        .from(s.vibecoders)
        .where(and(eq(sql`lower(${s.vibecoders.tgUsername})`, username), eq(s.vibecoders.active, true)));
      if (vc) {
        await db.update(s.vibecoders).set({ tgUserId: BigInt(tgId) }).where(eq(s.vibecoders.id, vc.id));
        ctx.vibecoderId = vc.id;
      }
    }

    // resolveIdentity already attempted auto-link by username on this
    // update, so if we still don't have a vibecoderId, the user simply
    // isn't rostered yet. Echo back the @username the bot sees so the
    // manager can match the Team page entry exactly.
    if (ctx.vibecoderId || ctx.isManager) {
      let name = '';
      if (ctx.vibecoderId) {
        const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, ctx.vibecoderId));
        name = vc?.fullNameRu ?? '';
      } else if (ctx.managerId) {
        const [mgr] = await db.select().from(s.growthManagers).where(eq(s.growthManagers.id, ctx.managerId));
        name = mgr?.fullNameRu ?? '';
      }
      await ctx.reply(t.linked(name), { reply_markup: ctx.isManager ? managerMenu : mainMenu });
      return;
    }

    await ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
  });

  bot.command('help', async (ctx) => {
    if (ctx.vibecoderId) {
      const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, ctx.vibecoderId));
      await ctx.reply(t.linked(vc?.fullNameRu ?? ''));
    } else {
      await ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
    }
  });

  bot.command('cancel', async (ctx) => {
    await ctx.conversation.exitAll();
    await ctx.reply(t.cancel);
  });

  // Vibecoder commands — discipline only.
  // exitAll() before enter() guarantees a clean slate. Without it, a
  // previously-paused conversation (e.g. a user who hit /standup while
  // their vibecoder row wasn't linked) gets RESUMED with a replay-mode
  // synthetic ctx — and the wizard's null-guard fires because middleware
  // properties like ctx.vibecoderId don't survive replay.
  const enter = (name: string) => async (ctx: BotContext) => {
    if (!ctx.vibecoderId) return ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
    await ctx.conversation.exitAll();
    await ctx.conversation.enter(name);
  };
  bot.command('report', enter('report'));
  bot.command('standup', enter('standup'));
  bot.command('status', enter('status'));
  bot.command('brief', enter('brief'));

  bot.command('delivery', async (ctx) => {
    if (!ctx.vibecoderId) return ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
    const arg = (ctx.match ?? '').toString().trim();
    const briefId = Number(arg);
    if (!Number.isFinite(briefId) || briefId <= 0) {
      return ctx.reply('Использование: /delivery <briefId>');
    }
    await ctx.conversation.exitAll();
    await ctx.conversation.enter('delivery', briefId);
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

  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) console.error('Telegram API error:', e.description);
    else if (e instanceof HttpError) console.error('HTTP error:', e);
    else console.error('Bot error:', e);
  });

  return bot;
}

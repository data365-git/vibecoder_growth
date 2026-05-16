import { Bot, session, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { env } from '../env.js';
import { getT, tFor, isLang } from './i18n/index.js';
import type { Lang } from './i18n/types.js';
import type { BotContext, SessionData } from './types.js';
import { PgSessionStorage } from './session-storage.js';
import { resolveIdentity } from './middlewares/auth.js';
import { mainMenu, managerMenu } from './keyboards.js';
import { sendLanguagePicker, persistLanguage } from './language.js';
import { reportConversation } from './wizards/report.js';
import { standupConversation } from './wizards/standup.js';
import { statusConversation } from './wizards/status.js';
import { briefConversation } from './wizards/brief.js';
import { deliveryConversation } from './wizards/delivery.js';
import { startOfflineMode, endOfflineMode } from './wizards/offline.js';

// Localised command pickers, registered per Telegram client language. Telegram
// matches by the user's app language (`language_code`), not by our stored
// preference — so this only affects the "/" autocomplete popup, not the
// content of replies. Replies use ctx.lang.
// PAUSED 2026-05-16: /standup, /brief, /delivery hidden from the picker.
const COMMAND_PICKER: Record<Lang, Array<{ command: string; description: string }>> = {
  ru: [
    { command: 'status', description: 'Короткий статус — над чем работаешь сейчас' },
    { command: 'report', description: 'Отчёт за день (до 18:00)' },
    { command: 'settings', description: 'Сменить язык' },
    { command: 'cancel', description: 'Отменить текущий wizard' },
    { command: 'help', description: 'Подсказка по командам' },
  ],
  en: [
    { command: 'status', description: 'Quick status — what you are working on now' },
    { command: 'report', description: 'Daily report (before 18:00)' },
    { command: 'settings', description: 'Change language' },
    { command: 'cancel', description: 'Cancel the current wizard' },
    { command: 'help', description: 'Command hints' },
  ],
  uz: [
    { command: 'status', description: 'Qisqa status — hozir nima ustida ishlayapsan' },
    { command: 'report', description: 'Kunlik hisobot (18:00 gacha)' },
    { command: 'settings', description: 'Tilni almashtirish' },
    { command: 'cancel', description: 'Joriy wizardni bekor qilish' },
    { command: 'help', description: 'Komandalar boʻyicha ipucha' },
  ],
};

export function createBot(): Bot<BotContext> {
  if (!env.GROWTH_BOT_TOKEN) throw new Error('GROWTH_BOT_TOKEN not set');
  const bot = new Bot<BotContext>(env.GROWTH_BOT_TOKEN);

  // Register command suggestions in Telegram's UI. ru is the default scope;
  // en + uz are language-scoped overrides. Fire-and-forget — if Telegram is
  // briefly unreachable it's not worth crashing startup over.
  bot.api.setMyCommands(COMMAND_PICKER.ru).catch((e) => {
    console.warn('[bot] setMyCommands(default) failed:', e);
  });
  bot.api.setMyCommands(COMMAND_PICKER.en, { language_code: 'en' }).catch((e) => {
    console.warn('[bot] setMyCommands(en) failed:', e);
  });
  bot.api.setMyCommands(COMMAND_PICKER.uz, { language_code: 'uz' }).catch((e) => {
    console.warn('[bot] setMyCommands(uz) failed:', e);
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
  // PAUSED — see COMMAND_PICKER note above.
  // bot.use(createConversation(standupConversation, 'standup'));
  bot.use(createConversation(statusConversation, 'status'));
  // bot.use(createConversation(briefConversation, 'brief'));
  // bot.use(createConversation(deliveryConversation, 'delivery'));

  // Inline-keyboard callback: `setlang:<lang>`. Fires from the language
  // picker shown on first /start and from /settings.
  bot.callbackQuery(/^setlang:(ru|en|uz)$/, async (ctx) => {
    const lang = (ctx.match?.[1] ?? '') as Lang;
    if (!isLang(lang)) {
      await ctx.answerCallbackQuery();
      return;
    }
    await persistLanguage(ctx, lang);
    const t = getT(lang);
    await ctx.answerCallbackQuery({ text: t.languageChanged });
    // Replace the picker so a user can't double-click and confuse themselves.
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      /* picker may already be gone if user used /settings twice */
    }
    // Resolve display name for the greeting; both rows may exist.
    let name = '';
    if (ctx.vibecoderId) {
      const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, ctx.vibecoderId));
      name = vc?.fullNameRu ?? '';
    } else if (ctx.managerId) {
      const [mgr] = await db.select().from(s.growthManagers).where(eq(s.growthManagers.id, ctx.managerId));
      name = mgr?.fullNameRu ?? '';
    }
    if (ctx.vibecoderId || ctx.isManager) {
      await ctx.reply(t.linked(name), { reply_markup: ctx.isManager ? managerMenu : mainMenu });
    }
  });

  // /start — link by username if needed, then either prompt for a language
  // (first ever interaction) or send the localised welcome.
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
        if (isLang(mgr.lang)) ctx.lang = mgr.lang;
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
        if (!ctx.lang && isLang(vc.lang)) ctx.lang = vc.lang;
      }
    }

    if (!ctx.vibecoderId && !ctx.isManager) {
      const t = tFor(ctx);
      await ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
      return;
    }

    if (!ctx.lang) {
      await sendLanguagePicker(ctx, 'first');
      return;
    }

    const t = tFor(ctx);
    let name = '';
    if (ctx.vibecoderId) {
      const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, ctx.vibecoderId));
      name = vc?.fullNameRu ?? '';
    } else if (ctx.managerId) {
      const [mgr] = await db.select().from(s.growthManagers).where(eq(s.growthManagers.id, ctx.managerId));
      name = mgr?.fullNameRu ?? '';
    }
    await ctx.reply(t.linked(name), { reply_markup: ctx.isManager ? managerMenu : mainMenu });
  });

  bot.command('settings', async (ctx) => {
    if (!ctx.vibecoderId && !ctx.isManager) {
      const t = tFor(ctx);
      await ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
      return;
    }
    await sendLanguagePicker(ctx, 'settings');
  });

  bot.command('help', async (ctx) => {
    const t = tFor(ctx);
    if (ctx.vibecoderId) {
      const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, ctx.vibecoderId));
      await ctx.reply(t.linked(vc?.fullNameRu ?? ''));
    } else {
      await ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
    }
  });

  bot.command('cancel', async (ctx) => {
    await ctx.conversation.exitAll();
    await ctx.reply(tFor(ctx).cancel);
  });

  // Vibecoder commands — discipline only.
  // exitAll() before enter() guarantees a clean slate. Without it, a
  // previously-paused conversation (e.g. a user who hit /standup while
  // their vibecoder row wasn't linked) gets RESUMED with a replay-mode
  // synthetic ctx — and the wizard's null-guard fires because middleware
  // properties like ctx.vibecoderId don't survive replay.
  const enter = (name: string) => async (ctx: BotContext) => {
    const t = tFor(ctx);
    if (!ctx.vibecoderId) return ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
    if (!ctx.lang) {
      await sendLanguagePicker(ctx, 'first');
      return;
    }
    await ctx.conversation.exitAll();
    await ctx.conversation.enter(name);
  };
  bot.command('report', enter('report'));
  // PAUSED — see COMMAND_PICKER note above.
  // bot.command('standup', enter('standup'));
  bot.command('status', enter('status'));
  // bot.command('brief', enter('brief'));

  // bot.command('delivery', async (ctx) => {
  //   const t = tFor(ctx);
  //   if (!ctx.vibecoderId) return ctx.reply(t.notLinkedWithUsername(ctx.from?.username));
  //   if (!ctx.lang) { await sendLanguagePicker(ctx, 'first'); return; }
  //   const arg = (ctx.match ?? '').toString().trim();
  //   const briefId = Number(arg);
  //   if (!Number.isFinite(briefId) || briefId <= 0) {
  //     return ctx.reply(t.deliveryUsage);
  //   }
  //   await ctx.conversation.exitAll();
  //   await ctx.conversation.enter('delivery', briefId);
  // });

  // Manager commands
  bot.command('offline', async (ctx) => startOfflineMode(ctx, ctx.match?.toString()));
  bot.command('online', async (ctx) => endOfflineMode(ctx));

  bot.command('today', async (ctx) => {
    const t = tFor(ctx);
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

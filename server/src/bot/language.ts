import { InlineKeyboard } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { getT, isLang } from './i18n/index.js';
import type { Lang } from './i18n/types.js';
import type { BotContext } from './types.js';

// Build the 3-button language picker. Captions stay in their native
// language so a user who picked the wrong one before can still recognise
// the right button.
export function languageKeyboard(): InlineKeyboard {
  const t = getT('ru'); // any locale works — button labels are language-native
  return new InlineKeyboard()
    .text(t.langButtonRu, 'setlang:ru')
    .text(t.langButtonEn, 'setlang:en')
    .text(t.langButtonUz, 'setlang:uz');
}

export async function sendLanguagePicker(ctx: BotContext, mode: 'first' | 'settings' = 'first') {
  const t = getT(ctx.lang);
  const text = mode === 'settings' ? t.settingsTitle : t.chooseLanguage;
  await ctx.reply(text, { reply_markup: languageKeyboard() });
}

// Persist a language pick to whichever role rows the current Telegram user
// owns (a person can be both vibecoder + manager).
export async function persistLanguage(ctx: BotContext, lang: Lang): Promise<void> {
  if (!isLang(lang)) return;
  ctx.lang = lang;
  if (ctx.vibecoderId) {
    await db.update(s.vibecoders).set({ lang }).where(eq(s.vibecoders.id, ctx.vibecoderId));
  }
  if (ctx.managerId) {
    await db.update(s.growthManagers).set({ lang }).where(eq(s.growthManagers.id, ctx.managerId));
  }
}

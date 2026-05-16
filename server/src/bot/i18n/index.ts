import type { Conversation } from '@grammyjs/conversations';
import type { Lang, T } from './types.js';
import { uz } from './uz.js';
import type { BotContext } from '../types.js';
// PAUSED 2026-05-16: only Uzbek is active. The ru/en files remain in the
// repo. To restore the picker:
//   1. un-comment the two imports below;
//   2. change TABLE entries back to { ru, en, uz };
//   3. un-comment the language-picker logic in bot/index.ts.
// import { ru } from './ru.js';
// import { en } from './en.js';
// import { DEFAULT_LANG, isLang } from './types.js';

export type { Lang, T } from './types.js';
export { LANGS, DEFAULT_LANG, isLang } from './types.js';

// Every key points at uz while paused, so getT('ru' | 'en' | null) all
// resolve to Uzbek without touching call sites.
const TABLE: Record<Lang, T> = { ru: uz, en: uz, uz };

export function getT(_lang?: Lang | string | null): T {
  return TABLE.uz;
}

// Use outside conversations (where ctx.lang is populated by middleware).
export function tFor(ctx: BotContext): T {
  return getT(ctx.lang);
}

// Inside a conversation, ctx is a fresh replay context and middleware props
// (lang, vibecoderId, …) are NOT present — we have to bounce through
// conversation.external() to read the real outer ctx. See
// [[feedback-grammy-conversations-ctx]].
export async function tForConversation(
  conversation: Conversation<BotContext, BotContext>,
): Promise<T> {
  const lang = await conversation.external((outerCtx) => outerCtx.lang ?? null);
  return getT(lang);
}

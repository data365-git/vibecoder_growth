import type { Conversation } from '@grammyjs/conversations';
import type { Lang, T } from './types.js';
import { DEFAULT_LANG, isLang } from './types.js';
import { ru } from './ru.js';
import { en } from './en.js';
import { uz } from './uz.js';
import type { BotContext } from '../types.js';

export type { Lang, T } from './types.js';
export { LANGS, DEFAULT_LANG, isLang } from './types.js';

const TABLE: Record<Lang, T> = { ru, en, uz };

export function getT(lang: Lang | string | null | undefined): T {
  return isLang(lang) ? TABLE[lang] : TABLE[DEFAULT_LANG];
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

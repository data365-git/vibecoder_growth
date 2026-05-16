import type { Conversation } from '@grammyjs/conversations';
import { tForConversation } from '../i18n/index.js';
import type { BotContext } from '../types.js';

export type Conv = Conversation<BotContext, BotContext>;

export async function askText(
  conversation: Conv,
  ctx: BotContext,
  prompt: string,
): Promise<string> {
  await ctx.reply(prompt);
  const { message } = await conversation.wait();
  const text = message?.text?.trim();
  if (!text) {
    const t = await tForConversation(conversation);
    await ctx.reply(t.helperPleaseSendText);
    return askText(conversation, ctx, prompt);
  }
  if (text === '/cancel') throw new Error('__cancelled__');
  return text;
}

export async function askOptional(
  conversation: Conv,
  ctx: BotContext,
  prompt: string,
): Promise<string | null> {
  const v = await askText(conversation, ctx, prompt);
  const lower = v.toLowerCase();
  if (['нет', 'no', 'yoʻq', "yo'q", 'yoq', '-', 'пропустить', 'skip', 'oʻtkazib yubor', "o'tkazib yubor"].includes(lower)) return null;
  return v;
}

export async function askLines(
  conversation: Conv,
  ctx: BotContext,
  prompt: string,
  minCount: number,
  notEnoughMsg: string,
): Promise<string[]> {
  const raw = await askText(conversation, ctx, prompt);
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((l) => l.length > 0);
  if (lines.length < minCount) {
    const t = await tForConversation(conversation);
    await ctx.reply(`${notEnoughMsg} ${t.helperNeedMore(lines.length, minCount)}`);
    return askLines(conversation, ctx, prompt, minCount, notEnoughMsg);
  }
  return lines;
}

export async function askYesNoPartial(
  conversation: Conv,
  ctx: BotContext,
  prompt: string,
): Promise<'yes' | 'no' | 'partial'> {
  const v = (await askText(conversation, ctx, prompt)).toLowerCase();
  if (['да', 'yes', 'y', 'ha', 'xa'].includes(v)) return 'yes';
  if (['нет', 'no', 'n', 'yoʻq', "yo'q", 'yoq'].includes(v)) return 'no';
  return 'partial';
}

export async function askYesNo(
  conversation: Conv,
  ctx: BotContext,
  prompt: string,
): Promise<boolean> {
  const v = (await askText(conversation, ctx, prompt)).toLowerCase();
  return ['да', 'yes', 'y', 'true', '1', 'ha', 'xa'].includes(v);
}

export async function askUrl(
  conversation: Conv,
  ctx: BotContext,
  prompt: string,
): Promise<string> {
  const v = await askText(conversation, ctx, prompt);
  if (!/^https?:\/\//i.test(v)) {
    const t = await tForConversation(conversation);
    await ctx.reply(t.helperHttpLinkNeeded);
    return askUrl(conversation, ctx, prompt);
  }
  return v;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

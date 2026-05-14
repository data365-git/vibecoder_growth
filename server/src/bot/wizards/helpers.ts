import type { Conversation } from '@grammyjs/conversations';
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
    await ctx.reply('Пришли текст, пожалуйста.');
    return askText(conversation, ctx, prompt);
  }
  if (text === '/cancel') throw new Error('__cancelled__');
  return text;
}

export async function askOptional(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
  prompt: string,
): Promise<string | null> {
  const v = await askText(conversation, ctx, prompt);
  const lower = v.toLowerCase();
  if (['нет', 'no', '-', 'пропустить', 'skip'].includes(lower)) return null;
  return v;
}

export async function askLines(
  conversation: Conversation<BotContext, BotContext>,
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
    await ctx.reply(`${notEnoughMsg} ${lines.length}/${minCount}. Попробуй ещё раз.`);
    return askLines(conversation, ctx, prompt, minCount, notEnoughMsg);
  }
  return lines;
}

export async function askYesNoPartial(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
  prompt: string,
): Promise<'yes' | 'no' | 'partial'> {
  const v = (await askText(conversation, ctx, prompt)).toLowerCase();
  if (['да', 'yes', 'y'].includes(v)) return 'yes';
  if (['нет', 'no', 'n'].includes(v)) return 'no';
  return 'partial';
}

export async function askYesNo(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
  prompt: string,
): Promise<boolean> {
  const v = (await askText(conversation, ctx, prompt)).toLowerCase();
  return ['да', 'yes', 'y', 'true', '1'].includes(v);
}

export async function askUrl(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
  prompt: string,
): Promise<string> {
  const v = await askText(conversation, ctx, prompt);
  if (!/^https?:\/\//i.test(v)) {
    await ctx.reply('Нужна ссылка с http(s)://. Попробуй снова.');
    return askUrl(conversation, ctx, prompt);
  }
  return v;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

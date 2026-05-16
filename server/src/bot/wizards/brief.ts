import type { Conversation } from '@grammyjs/conversations';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { env } from '../../env.js';
import { tForConversation } from '../i18n/index.js';
import { askText, askLines, askOptional } from './helpers.js';
import { upsertDailyCard } from '../daily-card.js';
import type { BotContext } from '../types.js';

function parseDeadline(raw: string): Date | null {
  const text = raw.trim().toLowerCase();
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: env.TZ }));
  // ISO-like 2026-05-16 18:00
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})[ tT](\d{2}):(\d{2})$/);
  if (iso) return new Date(`${iso[1]}T${iso[2]}:${iso[3]}:00`);
  // today HH:MM
  const today = text.match(/^(сегодня|today)\s+(\d{1,2}):(\d{2})$/);
  if (today) {
    const d = new Date(now);
    d.setHours(Number(today[2]), Number(today[3]), 0, 0);
    return d;
  }
  // tomorrow HH:MM
  const tomorrow = text.match(/^(завтра|tomorrow)\s+(\d{1,2}):(\d{2})$/);
  if (tomorrow) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(Number(tomorrow[2]), Number(tomorrow[3]), 0, 0);
    return d;
  }
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function briefConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const t = await tForConversation(conversation);
  const vibecoderId = await conversation.external((outerCtx) => outerCtx.vibecoderId);
  if (!vibecoderId) {
    await ctx.reply(t.notLinked);
    return;
  }
  try {
    const taskTitle = await askText(conversation, ctx, t.briefStart);
    const understanding = await askText(conversation, ctx, t.briefQ2);
    const expectedResult = await askText(conversation, ctx, t.briefQ3);
    const userFlow = await askText(conversation, ctx, t.briefQ4);
    const steps = await askLines(conversation, ctx, t.briefQ5, 1, t.briefNeedAtLeastOneStep);
    let deadline: Date | null = null;
    while (!deadline) {
      const raw = await askText(conversation, ctx, t.briefQ6);
      deadline = parseDeadline(raw);
      if (!deadline) await ctx.reply('Не понял формат. Пример: `2026-05-16 18:00` или `завтра 17:00`');
    }
    const risks = await askOptional(conversation, ctx, t.briefQ7);

    const [row] = await db
      .insert(s.taskOwnershipBriefs)
      .values({
        vibecoderId,
        taskTitle,
        understanding,
        expectedResult,
        userFlow,
        steps,
        selfDeadline: deadline,
        risks,
        openQuestions: null,
      })
      .returning();
    await ctx.reply(`${t.done} ${t.briefSavedHint(row?.id ?? '?')}`);

    if (row?.id) {
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: env.TZ })).toISOString().slice(0, 10);
      await upsertDailyCard(ctx.api, vibecoderId, today);
    }
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

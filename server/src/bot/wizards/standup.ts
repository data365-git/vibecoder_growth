import type { Conversation } from '@grammyjs/conversations';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { env } from '../../env.js';
import { tForConversation } from '../i18n/index.js';
import { askText, askOptional } from './helpers.js';
import { upsertDailyCard } from '../daily-card.js';
import type { BotContext } from '../types.js';

function todayYmd(): string {
  return new Date(new Date().toLocaleString('en-US', { timeZone: env.TZ })).toISOString().slice(0, 10);
}

export async function standupConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const t = await tForConversation(conversation);
  const vibecoderId = await conversation.external((outerCtx) => outerCtx.vibecoderId);
  if (!vibecoderId) {
    await ctx.reply(t.notLinked);
    return;
  }
  const today = todayYmd();
  const existing = await db
    .select()
    .from(s.dailyStandups)
    .where(and(eq(s.dailyStandups.vibecoderId, vibecoderId), eq(s.dailyStandups.standupDate, today)));
  if (existing.length > 0) {
    await ctx.reply(t.standupAlready);
    return;
  }
  try {
    const completedYesterday = await askText(conversation, ctx, t.standupStart);
    const willCompleteToday = await askText(conversation, ctx, t.standupQ2);
    const mainDeadline = await askOptional(conversation, ctx, t.standupQ3);
    const blocker = await askOptional(conversation, ctx, t.standupQ4);
    const endOfDayDeliverable = await askText(conversation, ctx, t.standupQ5);

    await db.insert(s.dailyStandups).values({
      vibecoderId,
      standupDate: today,
      completedYesterday,
      willCompleteToday,
      mainDeadline,
      blocker,
      endOfDayDeliverable,
    });
    await ctx.reply(t.done);

    await upsertDailyCard(ctx.api, vibecoderId, today);
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

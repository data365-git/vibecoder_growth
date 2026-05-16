import type { Conversation } from '@grammyjs/conversations';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { env } from '../../env.js';
import { tForConversation } from '../i18n/index.js';
import { askText, askOptional, askYesNo } from './helpers.js';
import { activeOfflineSession } from '../middlewares/auth.js';
import { upsertDailyCard } from '../daily-card.js';
import type { BotContext } from '../types.js';

function todayYmd(): string {
  return new Date(new Date().toLocaleString('en-US', { timeZone: env.TZ })).toISOString().slice(0, 10);
}

export async function statusConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const t = await tForConversation(conversation);
  const vibecoderId = await conversation.external((outerCtx) => outerCtx.vibecoderId);
  if (!vibecoderId) {
    await ctx.reply(t.notLinked);
    return;
  }
  // Status updates now run every day during work hours (not just offline
  // mode). We still tag the row with the offline session id if one is
  // active, so historical reporting on offline cadence keeps working.
  const session = await activeOfflineSession();
  try {
    const currentTask = await askText(conversation, ctx, t.statusStart);
    const sinceLast = await askText(conversation, ctx, t.statusQ2);
    const doingNow = await askText(conversation, ctx, t.statusQ3);
    const blocker = await askOptional(conversation, ctx, t.statusQ4);
    const onTrack = await askYesNo(conversation, ctx, t.statusQ5);

    await db.insert(s.statusUpdates).values({
      vibecoderId,
      offlineSessionId: session?.id ?? null,
      currentTask,
      sinceLast,
      doingNow,
      blocker,
      onTrack,
    });
    await ctx.reply(t.done);

    await upsertDailyCard(ctx.api, vibecoderId, todayYmd());
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

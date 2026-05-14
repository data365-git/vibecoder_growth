import type { Conversation } from '@grammyjs/conversations';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { t } from '../i18n.ru.js';
import { askText, askOptional, askYesNo } from './helpers.js';
import { activeOfflineSession } from '../middlewares/auth.js';
import type { BotContext } from '../types.js';

export async function statusConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const vibecoderId = ctx.vibecoderId!;
  const session = await activeOfflineSession();
  if (!session) {
    await ctx.reply(t.statusNotOffline);
    return;
  }
  try {
    const currentTask = await askText(conversation, ctx, t.statusStart);
    const sinceLast = await askText(conversation, ctx, t.statusQ2);
    const doingNow = await askText(conversation, ctx, t.statusQ3);
    const blocker = await askOptional(conversation, ctx, t.statusQ4);
    const onTrack = await askYesNo(conversation, ctx, t.statusQ5);

    await db.insert(s.statusUpdates).values({
      vibecoderId,
      offlineSessionId: session.id,
      currentTask,
      sinceLast,
      doingNow,
      blocker,
      onTrack,
    });
    await ctx.reply(t.done);
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

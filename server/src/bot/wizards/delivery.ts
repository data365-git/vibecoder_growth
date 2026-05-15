import type { Conversation } from '@grammyjs/conversations';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { t } from '../i18n.ru.js';
import { askText, askOptional } from './helpers.js';
import { upsertDailyCard } from '../daily-card.js';
import { env } from '../../env.js';
import type { BotContext } from '../types.js';

export async function deliveryConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext, briefId: number) {
  const vibecoderId = await conversation.external((outerCtx) => outerCtx.vibecoderId);
  if (!vibecoderId) {
    await ctx.reply(t.notLinked);
    return;
  }
  const [brief] = await db
    .select()
    .from(s.taskOwnershipBriefs)
    .where(and(eq(s.taskOwnershipBriefs.id, briefId), eq(s.taskOwnershipBriefs.vibecoderId, vibecoderId)));
  if (!brief) {
    await ctx.reply(t.deliveryBriefNotFound);
    return;
  }
  try {
    const whatDone = await askText(conversation, ctx, t.deliveryStart(briefId));
    const whatChanged = await askText(conversation, ctx, t.deliveryQ2);
    const howToTest = await askText(conversation, ctx, t.deliveryQ3);
    const screenshotsRaw = await askOptional(conversation, ctx, t.deliveryQ4);
    const videoDemoUrl = await askOptional(conversation, ctx, t.deliveryQ5);
    const edgeCasesChecked = await askText(conversation, ctx, t.deliveryQ6);
    const knownIssues = await askOptional(conversation, ctx, t.deliveryQ7);

    const screenshots = screenshotsRaw
      ? screenshotsRaw.split('\n').map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l))
      : [];

    const completedAt = new Date();
    const onTime = completedAt <= brief.selfDeadline;

    await db.transaction(async (tx) => {
      await tx.insert(s.finalDeliveries).values({
        briefId,
        whatDone,
        whatChanged,
        howToTest,
        screenshots,
        videoDemoUrl,
        edgeCasesChecked,
        knownIssues,
        futureImprovements: null,
      });
      await tx
        .update(s.taskOwnershipBriefs)
        .set({ completedAt, onTime })
        .where(eq(s.taskOwnershipBriefs.id, briefId));
    });
    await ctx.reply(`${t.done} ${onTime ? '✅ В срок.' : '⚠️ После дедлайна.'}`);

    const today = new Date(new Date().toLocaleString('en-US', { timeZone: env.TZ })).toISOString().slice(0, 10);
    await upsertDailyCard(ctx.api, vibecoderId, today);
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

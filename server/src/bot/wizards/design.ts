import type { Conversation } from '@grammyjs/conversations';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { t } from '../i18n.ru.js';
import { askUrl, askLines, askOptional } from './helpers.js';
import type { BotContext } from '../types.js';

export async function designConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const vibecoderId = ctx.vibecoderId!;
  try {
    const refUrl = await askUrl(conversation, ctx, t.designStart);
    // Image is optional; we don't process photo uploads in v1 — accept URL/text/skip
    const refImage = await askOptional(conversation, ctx, t.designQ2);
    const observations = await askLines(conversation, ctx, t.designQ3, 3, t.designNeedThree);
    const applied = await askOptional(conversation, ctx, t.designQ4);

    const [row] = await db
      .insert(s.designRefs)
      .values({
        vibecoderId,
        refUrl,
        refImageUrl: refImage,
        observations,
        appliedInTask: applied,
      })
      .returning();
    await ctx.reply(t.done);
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

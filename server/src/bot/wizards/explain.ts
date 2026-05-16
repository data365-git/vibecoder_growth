import type { Conversation } from '@grammyjs/conversations';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { tForConversation } from '../i18n/index.js';
import { askText } from './helpers.js';
import type { BotContext } from '../types.js';

export async function explainConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const t = await tForConversation(conversation);
  const vibecoderId = ctx.vibecoderId!;
  try {
    const technicalVersion = await askText(conversation, ctx, t.explainStart);
    const simpleVersion = await askText(conversation, ctx, t.explainQ2);
    const metaphor = await askText(conversation, ctx, t.explainQ3);
    const businessValue = await askText(conversation, ctx, t.explainQ4);

    const [row] = await db
      .insert(s.explainNotes)
      .values({ vibecoderId, technicalVersion, simpleVersion, metaphor, businessValue })
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

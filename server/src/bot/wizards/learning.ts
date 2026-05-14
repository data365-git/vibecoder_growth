import type { Conversation } from '@grammyjs/conversations';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { t } from '../i18n.ru.js';
import { askUrl, askText, askLines } from './helpers.js';
import { syncNow } from '../../notion/sync.js';
import type { BotContext } from '../types.js';

export async function learningConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const vibecoderId = ctx.vibecoderId!;
  try {
    const sourceUrl = await askUrl(conversation, ctx, t.learningStart);
    const topic = await askText(conversation, ctx, t.learningQ2);
    const threeTakeaways = await askLines(conversation, ctx, t.learningQ3, 3, t.learningNeedThree);
    const applicationText = await askText(conversation, ctx, t.learningQ4);
    const actionToTry = await askText(conversation, ctx, t.learningQ5);

    const [row] = await db
      .insert(s.learningNotes)
      .values({ vibecoderId, sourceUrl, topic, threeTakeaways, applicationText, actionToTry })
      .returning();
    await ctx.reply(t.done);
    if (row) await syncNow('learning_notes', row as any);
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

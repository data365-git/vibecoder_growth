import type { Conversation } from '@grammyjs/conversations';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { t } from '../i18n.ru.js';
import { askUrl, askText, askLines } from './helpers.js';
import { syncNow } from '../../notion/sync.js';
import type { BotContext } from '../types.js';

const SOURCE_TYPES = ['podcast', 'video', 'interview', 'article', 'other'] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

export async function businessConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const vibecoderId = ctx.vibecoderId!;
  try {
    const sourceUrl = await askUrl(conversation, ctx, t.businessStart);
    let sourceTypeRaw = (await askText(conversation, ctx, t.businessQ2)).toLowerCase();
    if (!SOURCE_TYPES.includes(sourceTypeRaw as SourceType)) sourceTypeRaw = 'other';
    const fiveInsights = await askLines(conversation, ctx, t.businessQ3, 5, t.businessNeedFive);
    const crmErpConnection = await askText(conversation, ctx, t.businessQ4);
    const clientPain = await askText(conversation, ctx, t.businessQ5);
    const possibleSolution = await askText(conversation, ctx, t.businessQ6);

    const [row] = await db
      .insert(s.businessNotes)
      .values({
        vibecoderId,
        sourceUrl,
        sourceType: sourceTypeRaw as SourceType,
        fiveInsights,
        crmErpConnection,
        clientPain,
        possibleSolution,
      })
      .returning();
    await ctx.reply(t.done);
    if (row) await syncNow('business_notes', row as any);
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

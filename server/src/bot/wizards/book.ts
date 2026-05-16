import type { Conversation } from '@grammyjs/conversations';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { env } from '../../env.js';
import { tForConversation } from '../i18n/index.js';
import { askText, askLines } from './helpers.js';
import type { BotContext } from '../types.js';

function currentMonthYear(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: env.TZ }));
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

export async function bookConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const t = await tForConversation(conversation);
  const vibecoderId = ctx.vibecoderId!;
  const month = currentMonthYear();
  const existing = await db
    .select()
    .from(s.bookReflections)
    .where(and(eq(s.bookReflections.vibecoderId, vibecoderId), eq(s.bookReflections.monthYear, month)));
  if (existing.length > 0) {
    await ctx.reply(t.bookAlready);
    return;
  }
  try {
    const bookTitle = await askText(conversation, ctx, t.bookStart);
    const mainIdea = await askText(conversation, ctx, t.bookQ2);
    const fiveThoughts = await askLines(conversation, ctx, t.bookQ3, 5, t.bookNeedFive);
    const communicationHelp = await askText(conversation, ctx, t.bookQ4);
    const workApplication = await askText(conversation, ctx, t.bookQ5);

    const [row] = await db
      .insert(s.bookReflections)
      .values({
        vibecoderId,
        monthYear: month,
        bookTitle,
        mainIdea,
        fiveThoughts,
        communicationHelp,
        workApplication,
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

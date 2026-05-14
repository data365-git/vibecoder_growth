import type { Conversation } from '@grammyjs/conversations';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { env } from '../../env.js';
import { t } from '../i18n.ru.js';
import { askText, askOptional, askYesNoPartial, countWords } from './helpers.js';
import type { BotContext } from '../types.js';

function todayYmd(): string {
  const tz = env.TZ;
  return new Date(new Date().toLocaleString('en-US', { timeZone: tz })).toISOString().slice(0, 10);
}

function isPastCutoff(): boolean {
  const tz = env.TZ;
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  return now.getHours() >= 18;
}

export async function reportConversation(conversation: Conversation<BotContext, BotContext>, ctx: BotContext) {
  const vibecoderId = ctx.vibecoderId!;
  const today = todayYmd();

  const existing = await db
    .select()
    .from(s.dailyReports)
    .where(and(eq(s.dailyReports.vibecoderId, vibecoderId), eq(s.dailyReports.reportDate, today)));
  if (existing.length > 0 && existing[0]!.submittedAt) {
    await ctx.reply(t.reportAlready);
    return;
  }

  const late = isPastCutoff();

  try {
    const didToday = await askText(conversation, ctx, t.reportStart);
    const completed = await askText(conversation, ctx, t.reportQ2);
    const inProgress = await askText(conversation, ctx, t.reportQ3);
    const blockers = await askOptional(conversation, ctx, t.reportQ4);
    const plansTomorrow = await askText(conversation, ctx, t.reportQ5);
    const proofRaw = await askOptional(conversation, ctx, t.reportQ6);
    const promise = await askYesNoPartial(conversation, ctx, t.reportQ7);

    const proofLinks = proofRaw
      ? proofRaw.split('\n').map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l))
      : [];
    const hasProof = proofLinks.length > 0;
    const wc = countWords([didToday, completed ?? '', inProgress ?? '', blockers ?? '', plansTomorrow].join(' '));

    const [saved] = await db
      .insert(s.dailyReports)
      .values({
        vibecoderId,
        reportDate: today,
        didToday,
        completed,
        inProgress,
        blockers,
        plansTomorrow,
        proofLinks,
        keptPromise: promise === 'yes' ? true : promise === 'no' ? false : null,
        submittedAt: new Date(),
        status: late ? 'late' : 'on_time',
        hasProof,
        wordCount: wc,
      })
      .onConflictDoUpdate({
        target: [s.dailyReports.vibecoderId, s.dailyReports.reportDate],
        set: {
          didToday,
          completed,
          inProgress,
          blockers,
          plansTomorrow,
          proofLinks,
          keptPromise: promise === 'yes' ? true : promise === 'no' ? false : null,
          submittedAt: new Date(),
          status: late ? 'late' : 'on_time',
          hasProof,
          wordCount: wc,
        },
      })
      .returning();

    await ctx.reply(late ? t.reportLate : t.done);

    // Forward to reporting group
    if (env.GROWTH_REPORTING_CHAT_ID) {
      const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, vibecoderId));
      const header = `📋 Daily report · ${vc?.fullNameRu ?? `vc#${vibecoderId}`} · ${today}${late ? ' · LATE' : ''}`;
      const body = [
        `*Сделал:* ${didToday}`,
        `*Завершил:* ${completed ?? '-'}`,
        `*В процессе:* ${inProgress ?? '-'}`,
        `*Blockers:* ${blockers ?? 'нет'}`,
        `*Завтра:* ${plansTomorrow}`,
        proofLinks.length > 0 ? `*Proof:* ${proofLinks.join(' · ')}` : '',
        `*Обещание выполнено:* ${promise}`,
      ]
        .filter(Boolean)
        .join('\n');
      try {
        const sent = await ctx.api.sendMessage(env.GROWTH_REPORTING_CHAT_ID, `${header}\n\n${body}`, {
          parse_mode: 'Markdown',
        });
        if (saved?.id) {
          await db
            .update(s.dailyReports)
            .set({ forwardedMessageId: BigInt(sent.message_id) })
            .where(eq(s.dailyReports.id, saved.id));
        }
      } catch (err) {
        console.error('Failed to forward report:', err);
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message === '__cancelled__') {
      await ctx.reply(t.cancel);
      return;
    }
    throw e;
  }
}

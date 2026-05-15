import type { Api } from 'grammy';
import { eq, and, gte, lt, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { env } from '../env.js';

// One rolling Telegram message per (vibecoder, day). Every wizard's save
// path calls upsertDailyCard(...), which re-renders the full card from the
// underlying tables and either sends a new message or edits the existing
// one in place. Manager scrolls the group, sees one growing post per
// person per day — no topics, no tab-switching.

// Asia/Tashkent has no DST and is UTC+5 year-round. Hard-coding the offset
// keeps the day-range math obvious and reliable. If the company ever
// supports another TZ this becomes a per-vibecoder setting.
const TZ_OFFSET = '+05:00';

function dayRange(ymd: string): { start: Date; end: Date } {
  const start = new Date(`${ymd}T00:00:00${TZ_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// UTC+5 fixed offset. Asia/Tashkent has no DST, so this is always correct.
// We avoid toLocaleString→new Date() because when TZ=Asia/Tashkent is set in
// the process env, Node treats the locale string as local (Tashkent) time,
// then toISOString() converts back to UTC — resulting in the wrong time shown.
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

function hm(d: Date): string {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(11, 16);
}

function ymdHm(d: Date): string {
  const s = new Date(d.getTime() + TZ_OFFSET_MS).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}

function statusBadge(report: typeof s.dailyReports.$inferSelect | undefined): string {
  if (!report || !report.submittedAt) return '⏳ pending';
  if (report.status === 'on_time') return '✅ on-time';
  if (report.status === 'late') return '⚠️ late';
  return '❌ missed';
}

async function renderCard(vibecoderId: number, ymd: string): Promise<string> {
  const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, vibecoderId));
  const name = vc?.fullNameRu ?? `vc#${vibecoderId}`;

  const { start, end } = dayRange(ymd);

  const [standup] = await db
    .select()
    .from(s.dailyStandups)
    .where(and(eq(s.dailyStandups.vibecoderId, vibecoderId), eq(s.dailyStandups.standupDate, ymd)));

  const statuses = await db
    .select()
    .from(s.statusUpdates)
    .where(
      and(
        eq(s.statusUpdates.vibecoderId, vibecoderId),
        gte(s.statusUpdates.sentAt, start),
        lt(s.statusUpdates.sentAt, end),
      ),
    )
    .orderBy(s.statusUpdates.sentAt);

  const [report] = await db
    .select()
    .from(s.dailyReports)
    .where(and(eq(s.dailyReports.vibecoderId, vibecoderId), eq(s.dailyReports.reportDate, ymd)));

  const briefsToday = await db
    .select()
    .from(s.taskOwnershipBriefs)
    .where(
      and(
        eq(s.taskOwnershipBriefs.vibecoderId, vibecoderId),
        gte(s.taskOwnershipBriefs.createdAt, start),
        lt(s.taskOwnershipBriefs.createdAt, end),
      ),
    );

  // Deliveries closed today, by anyone in the brief chain belonging to this vc.
  const vcBriefs = await db
    .select({ id: s.taskOwnershipBriefs.id, title: s.taskOwnershipBriefs.taskTitle, onTime: s.taskOwnershipBriefs.onTime })
    .from(s.taskOwnershipBriefs)
    .where(eq(s.taskOwnershipBriefs.vibecoderId, vibecoderId));
  const briefById = new Map(vcBriefs.map((b) => [b.id, b]));
  const deliveriesToday = vcBriefs.length
    ? await db
        .select()
        .from(s.finalDeliveries)
        .where(
          and(
            inArray(s.finalDeliveries.briefId, vcBriefs.map((b) => b.id)),
            gte(s.finalDeliveries.submittedAt, start),
            lt(s.finalDeliveries.submittedAt, end),
          ),
        )
    : [];

  const lines: string[] = [];
  lines.push(`📅 ${ymd} · ${name} · ${statusBadge(report)}`);
  lines.push('');

  if (standup) {
    lines.push(`☀️ Stand-up · ${hm(standup.submittedAt)}`);
    lines.push(`Вчера: ${standup.completedYesterday}`);
    lines.push(`Сегодня: ${standup.willCompleteToday}`);
    lines.push(`Deadline: ${standup.mainDeadline ?? '-'}`);
    lines.push(`Blocker: ${standup.blocker ?? 'нет'}`);
    lines.push(`EOD: ${standup.endOfDayDeliverable}`);
    lines.push('');
  }

  for (const st of statuses) {
    const parts = [
      `⚡ ${hm(st.sentAt)}`,
      st.currentTask,
      `сейчас: ${st.doingNow ?? '-'}`,
      `blocker: ${st.blocker ?? 'нет'}`,
      `в срок: ${st.onTrack ? '✅' : '❌'}`,
    ];
    lines.push(parts.join(' · '));
  }
  if (statuses.length > 0) lines.push('');

  if (report?.submittedAt) {
    lines.push(`📋 Report · ${hm(report.submittedAt)}${report.status === 'late' ? ' · LATE' : ''}`);
    lines.push(`Сделал: ${report.didToday}`);
    if (report.completed) lines.push(`Завершил: ${report.completed}`);
    if (report.inProgress) lines.push(`В процессе: ${report.inProgress}`);
    lines.push(`Blockers: ${report.blockers ?? 'нет'}`);
    if (report.plansTomorrow) lines.push(`Завтра: ${report.plansTomorrow}`);
    const proofs = Array.isArray(report.proofLinks) ? (report.proofLinks as string[]) : [];
    if (proofs.length > 0) lines.push(`Proof: ${proofs.join(' · ')}`);
    lines.push(
      `Promise: ${report.keptPromise === true ? '✅' : report.keptPromise === false ? '❌' : '~частично'}`,
    );
    lines.push('');
  }

  for (const b of briefsToday) {
    lines.push(`📐 Brief #${b.id} · ${b.taskTitle} · self-deadline: ${ymdHm(b.selfDeadline)}`);
  }

  for (const d of deliveriesToday) {
    const brief = briefById.get(d.briefId);
    const tag = brief?.onTime === true ? '✅ в срок' : brief?.onTime === false ? '⚠️ позже дедлайна' : '';
    lines.push(`📦 Delivery · brief #${d.briefId}${brief ? ` · ${brief.title}` : ''}${tag ? ` · ${tag}` : ''}`);
  }

  // Telegram caps a single message at 4096 chars. Truncate defensively;
  // in practice a real day for one person won't hit it.
  const text = lines.join('\n');
  return text.length > 3900 ? text.slice(0, 3900) + '\n…(обрезано)' : text;
}

export async function upsertDailyCard(api: Api, vibecoderId: number, ymd: string): Promise<void> {
  const chatId = env.GROWTH_GROUP_CHAT_ID;
  if (!chatId) return;

  const text = await renderCard(vibecoderId, ymd);

  const [existing] = await db
    .select()
    .from(s.dailyCards)
    .where(and(eq(s.dailyCards.vibecoderId, vibecoderId), eq(s.dailyCards.cardDate, ymd)));

  if (existing) {
    try {
      await api.editMessageText(chatId, Number(existing.messageId), text);
      await db
        .update(s.dailyCards)
        .set({ updatedAt: new Date() })
        .where(eq(s.dailyCards.id, existing.id));
      return;
    } catch (err) {
      // If the message was deleted from the group, fall through and post a fresh one.
      console.warn('[daily-card] edit failed, will repost:', err);
    }
  }

  try {
    const sent = await api.sendMessage(chatId, text);
    await db
      .insert(s.dailyCards)
      .values({
        vibecoderId,
        cardDate: ymd,
        chatId: BigInt(chatId),
        messageId: BigInt(sent.message_id),
      })
      .onConflictDoUpdate({
        target: [s.dailyCards.vibecoderId, s.dailyCards.cardDate],
        set: {
          chatId: BigInt(chatId),
          messageId: BigInt(sent.message_id),
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    console.error('[daily-card] send failed:', err);
  }
}

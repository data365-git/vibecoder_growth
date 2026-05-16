import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { isLang } from '../i18n/types.js';
import type { BotContext } from '../types.js';

// Resolve the Telegram user to a vibecoder / manager row.
// Order matters:
//   1. Try direct match by tg_user_id (the fast happy path after first link).
//   2. If still not linked and we have a Telegram @username, find the row
//      by username — regardless of what tg_user_id currently holds — and
//      stamp the current tg_user_id on it. The manager owns the roster
//      (Team page), so a username match is authoritative. We need to
//      overwrite, not just fill-when-null, because a stale tg_user_id on
//      the row would otherwise block a legitimate re-link (we observed this
//      with Saidumar's row).
export async function resolveIdentity(ctx: BotContext, next: () => Promise<void>) {
  const tgId = ctx.from?.id;
  if (!tgId) {
    await next();
    return;
  }
  const username = ctx.from?.username?.toLowerCase();

  // --- Vibecoder ---
  let [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.tgUserId, BigInt(tgId)));
  if (!vc && username) {
    const [match] = await db
      .select()
      .from(s.vibecoders)
      .where(
        and(eq(sql`lower(${s.vibecoders.tgUsername})`, username), eq(s.vibecoders.active, true)),
      );
    if (match) {
      if (match.tgUserId && match.tgUserId !== BigInt(tgId)) {
        console.log(
          `[auth] vibecoder #${match.id} (@${match.tgUsername}) had tg_user_id=${match.tgUserId}, relinking to ${tgId}`,
        );
      }
      const [linked] = await db
        .update(s.vibecoders)
        .set({ tgUserId: BigInt(tgId) })
        .where(eq(s.vibecoders.id, match.id))
        .returning();
      vc = linked ?? match;
    }
  }
  if (vc) ctx.vibecoderId = vc.id;

  // --- Manager ---
  let [mgr] = await db.select().from(s.growthManagers).where(eq(s.growthManagers.tgUserId, BigInt(tgId)));
  if (!mgr && username) {
    const [match] = await db
      .select()
      .from(s.growthManagers)
      .where(eq(sql`lower(${s.growthManagers.tgUsername})`, username));
    if (match) {
      if (match.tgUserId && match.tgUserId !== BigInt(tgId)) {
        console.log(
          `[auth] manager #${match.id} (@${match.tgUsername}) had tg_user_id=${match.tgUserId}, relinking to ${tgId}`,
        );
      }
      const [linked] = await db
        .update(s.growthManagers)
        .set({ tgUserId: BigInt(tgId) })
        .where(eq(s.growthManagers.id, match.id))
        .returning();
      mgr = linked ?? match;
    }
  }
  if (mgr) {
    ctx.managerId = mgr.id;
    ctx.isManager = true;
  }

  // Resolve preferred language. Manager wins when both rows exist (e.g.
  // Saidumar is a vibecoder + manager) — managers tend to switch UI
  // separately. Falls through to `null` so handlers prompt the picker.
  const rawLang = mgr?.lang ?? vc?.lang ?? null;
  ctx.lang = isLang(rawLang) ? rawLang : null;

  await next();
}

export async function isOfflineModeActive(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(s.offlineModeLog)
    .where(isNull(s.offlineModeLog.endedAt))
    .limit(1);
  return Boolean(row);
}

export async function activeOfflineSession() {
  const [row] = await db
    .select()
    .from(s.offlineModeLog)
    .where(isNull(s.offlineModeLog.endedAt))
    .limit(1);
  return row ?? null;
}

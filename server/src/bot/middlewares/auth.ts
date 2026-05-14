import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import type { BotContext } from '../types.js';

export async function resolveIdentity(ctx: BotContext, next: () => Promise<void>) {
  const tgId = ctx.from?.id;
  if (!tgId) {
    await next();
    return;
  }
  const [vc] = await db
    .select()
    .from(s.vibecoders)
    .where(eq(s.vibecoders.tgUserId, BigInt(tgId)));
  if (vc) ctx.vibecoderId = vc.id;

  const [mgr] = await db
    .select()
    .from(s.growthManagers)
    .where(eq(s.growthManagers.tgUserId, BigInt(tgId)));
  if (mgr) {
    ctx.managerId = mgr.id;
    ctx.isManager = true;
  }
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

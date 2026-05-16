import { eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as s from '../../db/schema/growth.js';
import { tFor } from '../i18n/index.js';
import type { BotContext } from '../types.js';

export async function startOfflineMode(ctx: BotContext, reason?: string) {
  const t = tFor(ctx);
  if (!ctx.isManager || !ctx.managerId) {
    await ctx.reply(t.noPermission);
    return;
  }
  const [active] = await db.select().from(s.offlineModeLog).where(isNull(s.offlineModeLog.endedAt)).limit(1);
  if (active) {
    await ctx.reply(t.offlineAlreadyOn);
    return;
  }
  await db.insert(s.offlineModeLog).values({
    managerId: ctx.managerId,
    startedAt: new Date(),
    reason: reason ?? null,
  });
  await ctx.reply(t.offlineOn);
}

export async function endOfflineMode(ctx: BotContext) {
  const t = tFor(ctx);
  if (!ctx.isManager) {
    await ctx.reply(t.noPermission);
    return;
  }
  const [active] = await db.select().from(s.offlineModeLog).where(isNull(s.offlineModeLog.endedAt)).limit(1);
  if (!active) {
    await ctx.reply(t.offlineAlreadyOff);
    return;
  }
  await db.update(s.offlineModeLog).set({ endedAt: new Date() }).where(eq(s.offlineModeLog.id, active.id));
  await ctx.reply(t.offlineOff);
}

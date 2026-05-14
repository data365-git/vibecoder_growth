import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { requireAdmin } from './_auth-mw.js';

export const settingRoutes = new Hono();
settingRoutes.use('*', requireAdmin);

settingRoutes.get('/', async (c) => {
  const rows = await db.select().from(s.growthSettings);
  const obj: Record<string, unknown> = {};
  for (const r of rows) obj[r.key] = r.value;
  return c.json(obj);
});

const putSchema = z.object({ key: z.string().min(1).max(64), value: z.unknown() });

settingRoutes.put('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);
  await db
    .insert(s.growthSettings)
    .values({ key: parsed.data.key, value: parsed.data.value as any })
    .onConflictDoUpdate({
      target: s.growthSettings.key,
      set: { value: parsed.data.value as any, updatedAt: new Date() },
    });
  return c.json({ ok: true });
});

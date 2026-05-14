import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { sign, requireAdmin, type AdminVars } from './_auth-mw.js';

export const authRoutes = new Hono<AdminVars>();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);
  const [admin] = await db.select().from(s.admins).where(eq(s.admins.email, parsed.data.email));
  if (!admin || !admin.active) return c.json({ error: 'invalid_credentials' }, 401);
  const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!ok) return c.json({ error: 'invalid_credentials' }, 401);
  const token = sign({ adminId: admin.id, email: admin.email, role: admin.role });
  return c.json({ token, admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role } });
});

authRoutes.get('/me', requireAdmin, (c) => {
  const admin = c.get('admin');
  return c.json({ id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role });
});

import type { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { env } from '../env.js';

export interface JwtPayload {
  adminId: number;
  email: string;
  role: string;
}

export type AdminRow = typeof s.admins.$inferSelect;

export type AdminVars = {
  Variables: {
    admin: AdminRow;
    jwt: JwtPayload;
  };
};

export function sign(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export const requireAdmin: MiddlewareHandler<AdminVars> = async (c, next) => {
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const [admin] = await db.select().from(s.admins).where(eq(s.admins.id, decoded.adminId));
    if (!admin || !admin.active) return c.json({ error: 'unauthorized' }, 401);
    c.set('admin', admin);
    c.set('jwt', decoded);
  } catch {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
};

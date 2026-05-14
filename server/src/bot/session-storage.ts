import type { StorageAdapter } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';

const TTL_MS = 24 * 60 * 60 * 1000;

export class PgSessionStorage<T> implements StorageAdapter<T> {
  async read(key: string): Promise<T | undefined> {
    const [row] = await db.select().from(s.botSessions).where(eq(s.botSessions.key, key));
    if (!row) return undefined;
    if (row.expiresAt < new Date()) return undefined;
    return row.state as T;
  }
  async write(key: string, value: T): Promise<void> {
    const expiresAt = new Date(Date.now() + TTL_MS);
    await db
      .insert(s.botSessions)
      .values({ key, state: value as unknown as object, expiresAt })
      .onConflictDoUpdate({
        target: s.botSessions.key,
        set: { state: value as unknown as object, expiresAt },
      });
  }
  async delete(key: string): Promise<void> {
    await db.delete(s.botSessions).where(eq(s.botSessions.key, key));
  }
}

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import * as s from '../src/db/schema/growth.js';
import { env } from '../src/env.js';

async function main() {
  const email = env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@data365.local';
  const password = env.ADMIN_BOOTSTRAP_PASSWORD ?? 'change-me';
  const existing = await db.select().from(s.admins).where(eq(s.admins.email, email));
  if (existing.length === 0) {
    await db.insert(s.admins).values({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      fullName: 'Bootstrap Admin',
      role: 'admin',
    });
    console.log(`Bootstrap admin created: ${email}`);
  } else {
    console.log(`Admin ${email} already exists, skipping.`);
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

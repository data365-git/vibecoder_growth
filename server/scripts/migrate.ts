import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../src/db/client.js';

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migrations applied.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

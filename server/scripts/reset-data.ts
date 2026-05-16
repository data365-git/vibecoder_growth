// Reset every transactional table while preserving the roster
// (admins / vibecoders / growth_managers). Also clears tg_user_id and
// lang on user rows so everyone is forced to /start again and pick
// their language. Idempotent.
import { sql } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';

const TRUNCATE_TABLES = [
  'offline_mode_log',
  'daily_reports',
  'status_updates',
  'daily_standups',
  'design_refs',
  'business_notes',
  'learning_notes',
  'explain_notes',
  'book_reflections',
  'task_ownership_briefs',
  'final_deliveries',
  'weekly_growth_reviews',
  'monthly_scores',
  'score_components',
  'bot_sessions',
  'bot_reminders',
  'daily_cards',
  'notion_sync_queue',
  'growth_settings',
] as const;

async function main() {
  console.log('[reset] truncating transactional tables…');
  const list = TRUNCATE_TABLES.map((t) => `"${t}"`).join(', ');
  await db.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`));
  console.log(`[reset] truncated: ${TRUNCATE_TABLES.join(', ')}`);

  console.log('[reset] clearing tg_user_id + lang on vibecoders / growth_managers…');
  await db.execute(sql`UPDATE vibecoders SET tg_user_id = NULL, lang = NULL`);
  await db.execute(sql`UPDATE growth_managers SET tg_user_id = NULL, lang = NULL`);

  console.log('[reset] done. Users keep their @username; everyone will re-link + re-pick language on next /start.');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

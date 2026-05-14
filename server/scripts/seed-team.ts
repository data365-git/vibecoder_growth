import { eq, sql } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import * as s from '../src/db/schema/growth.js';

interface VibecoderSpec {
  tgUsername: string;
  fullNameRu: string;
  role: string;
  baseSalaryUzs: number;
  bonusBaselineUzs: number;
}
interface ManagerSpec {
  tgUsername: string;
  fullNameRu: string;
}

// Demo baselines — easy to read in UI, easy to verify bonus math.
const VIBECODERS: VibecoderSpec[] = [
  { tgUsername: 'sardorov_saidumar',  fullNameRu: 'Saidumar Sardorov', role: 'vibecoder (lead)', baseSalaryUzs: 6_000_000, bonusBaselineUzs: 2_000_000 },
  { tgUsername: 'Samandar_work',      fullNameRu: 'Samandar',          role: 'vibecoder',        baseSalaryUzs: 5_000_000, bonusBaselineUzs: 1_500_000 },
  { tgUsername: 'jasurbek_work',      fullNameRu: 'Jasurbek',          role: 'vibecoder',        baseSalaryUzs: 5_000_000, bonusBaselineUzs: 1_500_000 },
  { tgUsername: 'hikoyacii',          fullNameRu: 'Islom',             role: 'vibecoder',        baseSalaryUzs: 5_000_000, bonusBaselineUzs: 1_500_000 },
  { tgUsername: 'Abdulaziym_data365', fullNameRu: 'Abdulaziym',        role: 'vibecoder',        baseSalaryUzs: 5_000_000, bonusBaselineUzs: 1_500_000 },
];

// Saidumar is BOTH a vibecoder and a manager (admin role for the demo).
const MANAGERS: ManagerSpec[] = [
  { tgUsername: 'Bunyod_ish_akkaunt', fullNameRu: 'Bunyod' },
  { tgUsername: 'sardorov_saidumar',  fullNameRu: 'Saidumar Sardorov' },
];

async function upsertVibecoder(spec: VibecoderSpec): Promise<number> {
  const [existing] = await db
    .select()
    .from(s.vibecoders)
    .where(eq(sql`lower(${s.vibecoders.tgUsername})`, spec.tgUsername.toLowerCase()));
  if (existing) {
    await db
      .update(s.vibecoders)
      .set({
        fullNameRu: spec.fullNameRu,
        role: spec.role,
        baseSalaryUzs: spec.baseSalaryUzs,
        bonusBaselineUzs: spec.bonusBaselineUzs,
        active: true,
      })
      .where(eq(s.vibecoders.id, existing.id));
    console.log(`[update] vibecoder ${spec.fullNameRu} (@${spec.tgUsername}) → id=${existing.id}`);
    return existing.id;
  }
  const [created] = await db
    .insert(s.vibecoders)
    .values({
      tgUsername: spec.tgUsername,
      fullNameRu: spec.fullNameRu,
      role: spec.role,
      baseSalaryUzs: spec.baseSalaryUzs,
      bonusBaselineUzs: spec.bonusBaselineUzs,
      active: true,
    })
    .returning();
  console.log(`[create] vibecoder ${spec.fullNameRu} (@${spec.tgUsername}) → id=${created!.id}`);
  return created!.id;
}

async function upsertManager(spec: ManagerSpec): Promise<number> {
  const [existing] = await db
    .select()
    .from(s.growthManagers)
    .where(eq(sql`lower(${s.growthManagers.tgUsername})`, spec.tgUsername.toLowerCase()));
  if (existing) {
    await db
      .update(s.growthManagers)
      .set({ fullNameRu: spec.fullNameRu })
      .where(eq(s.growthManagers.id, existing.id));
    console.log(`[update] manager   ${spec.fullNameRu} (@${spec.tgUsername}) → id=${existing.id}`);
    return existing.id;
  }
  const [created] = await db
    .insert(s.growthManagers)
    .values({ tgUsername: spec.tgUsername, fullNameRu: spec.fullNameRu, canToggleOffline: true })
    .returning();
  console.log(`[create] manager   ${spec.fullNameRu} (@${spec.tgUsername}) → id=${created!.id}`);
  return created!.id;
}

async function main() {
  console.log('Seeding vibecoders…');
  for (const vc of VIBECODERS) await upsertVibecoder(vc);

  console.log('\nSeeding managers…');
  for (const m of MANAGERS) await upsertManager(m);

  console.log('\nDone. Anyone listed above can now send /start to @data365_growth_bot and will be linked.');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

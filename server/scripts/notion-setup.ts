import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import * as s from '../src/db/schema/growth.js';
import { notion } from '../src/notion/client.js';
import { NOTION_DB_DEFS } from '../src/notion/databases.js';
import { env } from '../src/env.js';

function buildPropertySpec(p: { type: string; options?: string[] }) {
  switch (p.type) {
    case 'title': return { title: {} };
    case 'rich_text': return { rich_text: {} };
    case 'url': return { url: {} };
    case 'date': return { date: {} };
    case 'number': return { number: {} };
    case 'select': return { select: { options: (p.options ?? []).map((o) => ({ name: o })) } };
    case 'multi_select': return { multi_select: { options: (p.options ?? []).map((o) => ({ name: o })) } };
    default: return { rich_text: {} };
  }
}

async function loadExistingIds(): Promise<Record<string, string>> {
  const [row] = await db.select().from(s.growthSettings).where(eq(s.growthSettings.key, 'notion_db_ids'));
  return (row?.value as Record<string, string> | undefined) ?? {};
}

async function saveIds(ids: Record<string, string>) {
  const existing = await loadExistingIds();
  const merged = { ...existing, ...ids };
  await db
    .insert(s.growthSettings)
    .values({ key: 'notion_db_ids', value: merged })
    .onConflictDoUpdate({ target: s.growthSettings.key, set: { value: merged, updatedAt: new Date() } });
}

async function main() {
  if (!env.NOTION_TOKEN || !env.NOTION_PARENT_PAGE_ID) {
    console.error('Missing NOTION_TOKEN or NOTION_PARENT_PAGE_ID in .env. Aborting.');
    process.exit(1);
  }
  const existing = await loadExistingIds();
  const created: Record<string, string> = {};

  for (const def of NOTION_DB_DEFS) {
    if (existing[def.key]) {
      console.log(`[skip] ${def.title} already exists: ${existing[def.key]}`);
      continue;
    }
    const properties: Record<string, unknown> = {};
    for (const [name, spec] of Object.entries(def.properties)) {
      properties[name] = buildPropertySpec(spec);
    }
    const result = await notion().databases.create({
      parent: { type: 'page_id', page_id: env.NOTION_PARENT_PAGE_ID },
      title: [{ type: 'text', text: { content: def.title } }],
      properties: properties as any,
    });
    console.log(`[created] ${def.title} → ${result.id}`);
    created[def.key] = result.id;
  }

  if (Object.keys(created).length > 0) {
    await saveIds(created);
    console.log(`Saved ${Object.keys(created).length} new database IDs to growth_settings.`);
  } else {
    console.log('Nothing to create.');
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

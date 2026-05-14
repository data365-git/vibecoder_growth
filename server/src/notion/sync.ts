import { eq, and, isNull, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema/growth.js';
import { notion, isNotionConfigured } from './client.js';
import type { NotionDbKey } from './databases.js';

type AnyRow = Record<string, unknown> & { id: number };

const TABLE_TO_DB: Record<string, NotionDbKey> = {
  design_refs: 'designTasteLog',
  business_notes: 'businessThinkingLog',
  learning_notes: 'professionalLearningLog',
  explain_notes: 'explainLikeClientLog',
  book_reflections: 'bookReflectionLog',
  weekly_growth_reviews: 'weeklyGrowthReview',
};

async function getDbId(key: NotionDbKey): Promise<string | null> {
  const [row] = await db.select().from(s.growthSettings).where(eq(s.growthSettings.key, 'notion_db_ids'));
  const ids = (row?.value as Record<string, string> | undefined) ?? {};
  return ids[key] ?? null;
}

function rt(text: string | null | undefined) {
  if (!text) return [];
  // Notion rich_text has a 2000-char limit per chunk.
  const chunks: string[] = [];
  let s2 = String(text);
  while (s2.length > 2000) {
    chunks.push(s2.slice(0, 2000));
    s2 = s2.slice(2000);
  }
  chunks.push(s2);
  return chunks.map((t) => ({ type: 'text' as const, text: { content: t } }));
}

function title(text: string) {
  return { title: rt(text) };
}
function richText(text: string | null | undefined) {
  return { rich_text: rt(text ?? '') };
}
function urlProp(u: string | null | undefined) {
  return { url: u && u.length > 0 ? u : null };
}
function dateProp(d: Date | string | null | undefined) {
  if (!d) return { date: null };
  const iso = typeof d === 'string' ? d : d.toISOString().slice(0, 10);
  return { date: { start: iso } };
}
function selectProp(name: string | null | undefined) {
  return { select: name ? { name } : null };
}

async function propsForEntity(table: string, row: AnyRow): Promise<Record<string, unknown>> {
  const [vc] = await db.select().from(s.vibecoders).where(eq(s.vibecoders.id, row['vibecoder_id'] as number));
  const employee = vc?.fullNameRu ?? '';
  const created = (row['created_at'] as Date | undefined) ?? new Date();

  switch (table) {
    case 'design_refs': {
      const obs = (row['observations'] as string[] | undefined) ?? [];
      return {
        Title: title(`${employee} · ${created.toISOString().slice(0, 10)}`),
        Employee: richText(employee),
        Date: dateProp(created),
        'Reference URL': urlProp(row['ref_url'] as string),
        'Image URL': urlProp(row['ref_image_url'] as string),
        Observations: richText(obs.map((o, i) => `${i + 1}. ${o}`).join('\n')),
        'Applied in': richText((row['applied_in_task'] as string) ?? ''),
      };
    }
    case 'business_notes': {
      const insights = (row['five_insights'] as string[] | undefined) ?? [];
      return {
        Title: title(`${employee} · business · ${created.toISOString().slice(0, 10)}`),
        Employee: richText(employee),
        Date: dateProp(created),
        Source: urlProp(row['source_url'] as string),
        Type: selectProp(row['source_type'] as string),
        '5 Insights': richText(insights.map((o, i) => `${i + 1}. ${o}`).join('\n')),
        'CRM/ERP link': richText((row['crm_erp_connection'] as string) ?? ''),
        'Client pain': richText((row['client_pain'] as string) ?? ''),
        Solution: richText((row['possible_solution'] as string) ?? ''),
      };
    }
    case 'learning_notes': {
      const t3 = (row['three_takeaways'] as string[] | undefined) ?? [];
      return {
        Title: title(`${employee} · ${(row['topic'] as string) ?? 'learning'}`),
        Employee: richText(employee),
        Date: dateProp(created),
        URL: urlProp(row['source_url'] as string),
        Topic: richText((row['topic'] as string) ?? ''),
        '3 Takeaways': richText(t3.map((o, i) => `${i + 1}. ${o}`).join('\n')),
        Application: richText((row['application_text'] as string) ?? ''),
        Action: richText((row['action_to_try'] as string) ?? ''),
      };
    }
    case 'explain_notes': {
      return {
        Title: title(`${employee} · explain · ${created.toISOString().slice(0, 10)}`),
        Employee: richText(employee),
        Date: dateProp(created),
        Technical: richText((row['technical_version'] as string) ?? ''),
        Simple: richText((row['simple_version'] as string) ?? ''),
        Metaphor: richText((row['metaphor'] as string) ?? ''),
        'Business value': richText((row['business_value'] as string) ?? ''),
      };
    }
    case 'book_reflections': {
      const thoughts = (row['five_thoughts'] as string[] | undefined) ?? [];
      return {
        Title: title(`${employee} · ${(row['book_title'] as string) ?? 'book'}`),
        Employee: richText(employee),
        Month: richText((row['month_year'] as string) ?? ''),
        Book: richText((row['book_title'] as string) ?? ''),
        'Main idea': richText((row['main_idea'] as string) ?? ''),
        '5 Thoughts': richText(thoughts.map((o, i) => `${i + 1}. ${o}`).join('\n')),
        'Communication help': richText((row['communication_help'] as string) ?? ''),
        Application: richText((row['work_application'] as string) ?? ''),
      };
    }
    case 'weekly_growth_reviews': {
      return {
        Title: title(`${employee} · week of ${row['week_start']}`),
        Employee: richText(employee),
        Week: dateProp(row['week_start'] as string),
        'Improvement applied': richText((row['improvement_applied'] as string) ?? ''),
        'Task example': richText((row['task_example'] as string) ?? ''),
        'Manager notes': richText((row['manager_notes'] as string) ?? ''),
      };
    }
    default:
      return {};
  }
}

/** Queue an entity for Notion sync (idempotent on entity_table+entity_id). */
export async function enqueueSync(entityTable: string, entityId: number) {
  await db
    .insert(s.notionSyncQueue)
    .values({ entityTable, entityId })
    .onConflictDoNothing();
}

/** Try to create the Notion page now; on failure, queue for retry. */
export async function syncNow(entityTable: keyof typeof TABLE_TO_DB, row: AnyRow): Promise<string | null> {
  if (!isNotionConfigured()) {
    await enqueueSync(entityTable, row.id);
    return null;
  }
  const dbKey = TABLE_TO_DB[entityTable];
  if (!dbKey) return null;
  const dbId = await getDbId(dbKey);
  if (!dbId) {
    await enqueueSync(entityTable, row.id);
    return null;
  }
  try {
    const props = await propsForEntity(entityTable, row);
    const page = await notion().pages.create({
      parent: { database_id: dbId },
      properties: props as any,
    });
    return page.id;
  } catch (err) {
    await db.insert(s.notionSyncQueue).values({
      entityTable,
      entityId: row.id,
      attempts: 1,
      lastError: err instanceof Error ? err.message : String(err),
      nextRetryAt: new Date(Date.now() + 5 * 60_000),
    }).onConflictDoNothing();
    return null;
  }
}

/** Drain queue (called by scheduler). */
export async function drainSyncQueue(maxItems = 25) {
  if (!isNotionConfigured()) return { processed: 0, succeeded: 0 };
  const due = await db
    .select()
    .from(s.notionSyncQueue)
    .where(and(isNull(s.notionSyncQueue.syncedAt), lte(s.notionSyncQueue.nextRetryAt, new Date())))
    .limit(maxItems);

  let succeeded = 0;
  for (const item of due) {
    const tbl = item.entityTable as keyof typeof TABLE_TO_DB;
    const dbKey = TABLE_TO_DB[tbl];
    if (!dbKey) continue;
    const fetched = await fetchEntity(tbl, item.entityId);
    if (!fetched) continue;
    const dbId = await getDbId(dbKey);
    if (!dbId) continue;
    try {
      const props = await propsForEntity(tbl, fetched as AnyRow);
      const page = await notion().pages.create({
        parent: { database_id: dbId },
        properties: props as any,
      });
      await db.update(s.notionSyncQueue).set({ syncedAt: new Date() }).where(eq(s.notionSyncQueue.id, item.id));
      await writebackPageId(tbl, item.entityId, page.id);
      succeeded++;
    } catch (err) {
      const attempts = (item.attempts ?? 0) + 1;
      const backoffMs = Math.min(60 * 60 * 1000, 5 * 60 * 1000 * 2 ** attempts);
      await db
        .update(s.notionSyncQueue)
        .set({
          attempts,
          lastError: err instanceof Error ? err.message : String(err),
          nextRetryAt: new Date(Date.now() + backoffMs),
        })
        .where(eq(s.notionSyncQueue.id, item.id));
    }
  }
  return { processed: due.length, succeeded };
}

async function fetchEntity(table: keyof typeof TABLE_TO_DB, id: number) {
  switch (table) {
    case 'design_refs': return (await db.select().from(s.designRefs).where(eq(s.designRefs.id, id)))[0] as unknown as AnyRow;
    case 'business_notes': return (await db.select().from(s.businessNotes).where(eq(s.businessNotes.id, id)))[0] as unknown as AnyRow;
    case 'learning_notes': return (await db.select().from(s.learningNotes).where(eq(s.learningNotes.id, id)))[0] as unknown as AnyRow;
    case 'explain_notes': return (await db.select().from(s.explainNotes).where(eq(s.explainNotes.id, id)))[0] as unknown as AnyRow;
    case 'book_reflections': return (await db.select().from(s.bookReflections).where(eq(s.bookReflections.id, id)))[0] as unknown as AnyRow;
    case 'weekly_growth_reviews': return (await db.select().from(s.weeklyGrowthReviews).where(eq(s.weeklyGrowthReviews.id, id)))[0] as unknown as AnyRow;
    default: return null;
  }
}

async function writebackPageId(table: keyof typeof TABLE_TO_DB, id: number, pageId: string) {
  switch (table) {
    case 'design_refs': await db.update(s.designRefs).set({ notionPageId: pageId }).where(eq(s.designRefs.id, id)); break;
    case 'business_notes': await db.update(s.businessNotes).set({ notionPageId: pageId }).where(eq(s.businessNotes.id, id)); break;
    case 'learning_notes': await db.update(s.learningNotes).set({ notionPageId: pageId }).where(eq(s.learningNotes.id, id)); break;
    case 'explain_notes': await db.update(s.explainNotes).set({ notionPageId: pageId }).where(eq(s.explainNotes.id, id)); break;
    case 'book_reflections': await db.update(s.bookReflections).set({ notionPageId: pageId }).where(eq(s.bookReflections.id, id)); break;
    case 'weekly_growth_reviews': /* no notionPageId column */ break;
  }
}

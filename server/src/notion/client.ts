import { Client } from '@notionhq/client';
import { env } from '../env.js';

let _client: Client | null = null;
export function notion(): Client {
  if (!_client) {
    if (!env.NOTION_TOKEN) throw new Error('NOTION_TOKEN not set');
    _client = new Client({ auth: env.NOTION_TOKEN });
  }
  return _client;
}

export function isNotionConfigured(): boolean {
  return Boolean(env.NOTION_TOKEN && env.NOTION_PARENT_PAGE_ID);
}

// Schema for the 6 Notion databases the system creates and mirrors into.
// Used by the one-time setup script AND by the runtime sync layer.

export type NotionDbKey =
  | 'designTasteLog'
  | 'businessThinkingLog'
  | 'professionalLearningLog'
  | 'explainLikeClientLog'
  | 'bookReflectionLog'
  | 'weeklyGrowthReview';

type PropSpec = { type: 'title' | 'rich_text' | 'url' | 'date' | 'select' | 'number' | 'multi_select'; options?: string[] };

export interface NotionDbDef {
  key: NotionDbKey;
  title: string;
  properties: Record<string, PropSpec>;
}

export const NOTION_DB_DEFS: NotionDbDef[] = [
  {
    key: 'designTasteLog',
    title: 'Design Taste Log',
    properties: {
      Title: { type: 'title' },
      Employee: { type: 'rich_text' },
      Date: { type: 'date' },
      'Reference URL': { type: 'url' },
      'Image URL': { type: 'url' },
      Observations: { type: 'rich_text' },
      'Applied in': { type: 'rich_text' },
    },
  },
  {
    key: 'businessThinkingLog',
    title: 'Business Thinking Log',
    properties: {
      Title: { type: 'title' },
      Employee: { type: 'rich_text' },
      Date: { type: 'date' },
      Source: { type: 'url' },
      Type: { type: 'select', options: ['podcast', 'video', 'interview', 'article', 'other'] },
      '5 Insights': { type: 'rich_text' },
      'CRM/ERP link': { type: 'rich_text' },
      'Client pain': { type: 'rich_text' },
      Solution: { type: 'rich_text' },
    },
  },
  {
    key: 'professionalLearningLog',
    title: 'Professional Learning Log',
    properties: {
      Title: { type: 'title' },
      Employee: { type: 'rich_text' },
      Date: { type: 'date' },
      URL: { type: 'url' },
      Topic: { type: 'rich_text' },
      '3 Takeaways': { type: 'rich_text' },
      Application: { type: 'rich_text' },
      Action: { type: 'rich_text' },
    },
  },
  {
    key: 'explainLikeClientLog',
    title: 'Explain Like Client Log',
    properties: {
      Title: { type: 'title' },
      Employee: { type: 'rich_text' },
      Date: { type: 'date' },
      Technical: { type: 'rich_text' },
      Simple: { type: 'rich_text' },
      Metaphor: { type: 'rich_text' },
      'Business value': { type: 'rich_text' },
    },
  },
  {
    key: 'bookReflectionLog',
    title: 'Book Reflection Log',
    properties: {
      Title: { type: 'title' },
      Employee: { type: 'rich_text' },
      Month: { type: 'rich_text' },
      Book: { type: 'rich_text' },
      'Main idea': { type: 'rich_text' },
      '5 Thoughts': { type: 'rich_text' },
      'Communication help': { type: 'rich_text' },
      Application: { type: 'rich_text' },
    },
  },
  {
    key: 'weeklyGrowthReview',
    title: 'Weekly Growth Review',
    properties: {
      Title: { type: 'title' },
      Employee: { type: 'rich_text' },
      Week: { type: 'date' },
      'Improvement applied': { type: 'rich_text' },
      'Task example': { type: 'rich_text' },
      'Manager notes': { type: 'rich_text' },
    },
  },
];

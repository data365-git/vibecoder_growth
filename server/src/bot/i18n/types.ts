export type Lang = 'ru' | 'en' | 'uz';
export const LANGS: readonly Lang[] = ['ru', 'en', 'uz'] as const;
export const DEFAULT_LANG: Lang = 'ru';

export function isLang(v: unknown): v is Lang {
  return v === 'ru' || v === 'en' || v === 'uz';
}

// Single source of truth for every user-facing bot string.
// Adding a new key here forces every language file to provide it (TS error).
export interface T {
  // ---------- Greetings / system ----------
  notLinked: string;
  notLinkedWithUsername: (username: string | undefined) => string;
  linked: (name: string) => string;
  cancel: string;
  cancelHint: string;
  done: string;
  noPermission: string;
  unknownCommand: string;
  reminderHint: string;

  // ---------- Language picker / settings ----------
  chooseLanguage: string;
  languageChanged: string;
  settingsTitle: string;
  langButtonRu: string;
  langButtonEn: string;
  langButtonUz: string;

  // ---------- Daily report ----------
  reportStart: string;
  reportQ2: string;
  reportQ3: string;
  reportQ4: string;
  reportQ5: string;
  reportQ6: string;
  reportQ7: string;
  reportLate: string;
  reportClosed: string;
  reportAlready: string;

  // ---------- Standup (paused but kept) ----------
  standupStart: string;
  standupQ2: string;
  standupQ3: string;
  standupQ4: string;
  standupQ5: string;
  standupAlready: string;

  // ---------- Status ----------
  statusStart: string;
  statusQ2: string;
  statusQ3: string;
  statusQ4: string;
  statusQ5: string;

  // ---------- Design ----------
  designStart: string;
  designQ2: string;
  designQ3: string;
  designQ4: string;
  designNeedThree: string;

  // ---------- Business ----------
  businessStart: string;
  businessQ2: string;
  businessQ3: string;
  businessQ4: string;
  businessQ5: string;
  businessQ6: string;
  businessNeedFive: string;

  // ---------- Learning ----------
  learningStart: string;
  learningQ2: string;
  learningQ3: string;
  learningQ4: string;
  learningQ5: string;
  learningNeedThree: string;

  // ---------- Explain ----------
  explainStart: string;
  explainQ2: string;
  explainQ3: string;
  explainQ4: string;

  // ---------- Book ----------
  bookStart: string;
  bookQ2: string;
  bookQ3: string;
  bookQ4: string;
  bookQ5: string;
  bookAlready: string;
  bookNeedFive: string;

  // ---------- Brief (paused but kept) ----------
  briefStart: string;
  briefQ2: string;
  briefQ3: string;
  briefQ4: string;
  briefQ5: string;
  briefQ6: string;
  briefQ7: string;
  briefSavedHint: (id: number | string) => string;

  // ---------- Delivery (paused but kept) ----------
  deliveryStart: (id: number) => string;
  deliveryQ2: string;
  deliveryQ3: string;
  deliveryQ4: string;
  deliveryQ5: string;
  deliveryQ6: string;
  deliveryQ7: string;
  deliveryBriefNotFound: string;
  deliveryUsage: string;

  // ---------- Offline mode ----------
  offlineOn: string;
  offlineOff: string;
  offlineAlreadyOn: string;
  offlineAlreadyOff: string;

  // ---------- Wrong-topic nudge ----------
  wrongTopicNudge: (cmd: string) => string;

  // ---------- Helper prompts (askText / askLines / askUrl) ----------
  helperPleaseSendText: string;
  helperHttpLinkNeeded: string;
  helperNeedMore: (have: number, need: number) => string;

  // ---------- Inline wizard fragments ----------
  briefNeedAtLeastOneStep: string;
  deliveryOnTime: string;
  deliveryLate: string;

  // ---------- Scheduler DMs ----------
  nudgeReportSoft: string;
  nudgeReportFinal: string;
}

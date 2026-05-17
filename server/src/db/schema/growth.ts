import {
  pgTable,
  pgEnum,
  serial,
  bigserial,
  bigint,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  varchar,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------- Enums ----------
export const reportStatusEnum = pgEnum('report_status', ['on_time', 'late', 'missed']);
export const bonusTierEnum = pgEnum('bonus_tier', ['tier_100', 'tier_70', 'tier_40', 'tier_0']);
export const sourceTypeEnum = pgEnum('source_type', ['podcast', 'video', 'interview', 'article', 'other']);
export const reminderKindEnum = pgEnum('reminder_kind', [
  'standup',
  'report_soft',
  'report_final',
  'status_offline',
  'weekly_review',
  'month_end',
]);
export const pillarEnum = pgEnum('habit_pillar', [
  'discipline_reporting',
  'uxui_taste',
  'business_thinking',
  'professional_learning',
  'simple_explanation',
  'deadline_ownership',
]);
export const habitMarkStatusEnum = pgEnum('habit_mark_status', ['done', 'not_done']);

// ---------- Admin auth (for PM web UI) ----------
export const admins = pgTable(
  'admins',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: varchar('role', { length: 32 }).notNull().default('admin'), // admin | manager
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex('admins_email_unique').on(t.email),
  }),
);

// ---------- Roster ----------
export const vibecoders = pgTable(
  'vibecoders',
  {
    id: serial('id').primaryKey(),
    adminId: integer('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    tgUserId: bigint('tg_user_id', { mode: 'bigint' }),
    tgUsername: varchar('tg_username', { length: 64 }),
    fullNameRu: varchar('full_name_ru', { length: 255 }).notNull(),
    role: varchar('role', { length: 64 }).notNull().default('vibecoder'),
    startDate: date('start_date'),
    baseSalaryUzs: bigint('base_salary_uzs', { mode: 'number' }).notNull().default(0),
    bonusBaselineUzs: bigint('bonus_baseline_uzs', { mode: 'number' }).notNull().default(0),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Tashkent'),
    // 'ru' | 'en' | 'uz' — null until the user picks on first interaction.
    lang: varchar('lang', { length: 2 }),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tgUserIdx: uniqueIndex('vibecoders_tg_user_unique').on(t.tgUserId),
    tgUsernameIdx: index('vibecoders_tg_username_idx').on(t.tgUsername),
  }),
);

export const growthManagers = pgTable(
  'growth_managers',
  {
    id: serial('id').primaryKey(),
    adminId: integer('admin_id').references(() => admins.id, { onDelete: 'cascade' }),
    tgUserId: bigint('tg_user_id', { mode: 'bigint' }),
    tgUsername: varchar('tg_username', { length: 64 }),
    fullNameRu: varchar('full_name_ru', { length: 255 }).notNull(),
    canToggleOffline: boolean('can_toggle_offline').notNull().default(true),
    notifyChannelId: bigint('notify_channel_id', { mode: 'bigint' }),
    // 'ru' | 'en' | 'uz' — null until the manager picks on first interaction.
    lang: varchar('lang', { length: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tgUserIdx: uniqueIndex('managers_tg_user_unique').on(t.tgUserId),
    tgUsernameIdx: index('managers_tg_username_idx').on(t.tgUsername),
  }),
);

// ---------- Config ----------
export const growthSettings = pgTable('growth_settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const offlineModeLog = pgTable(
  'offline_mode_log',
  {
    id: serial('id').primaryKey(),
    managerId: integer('manager_id').references(() => growthManagers.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    reason: text('reason'),
  },
  (t) => ({ activeIdx: index('offline_active_idx').on(t.endedAt) }),
);

// ---------- Daily mechanics ----------
export const dailyReports = pgTable(
  'daily_reports',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    reportDate: date('report_date').notNull(),
    didToday: text('did_today').notNull(),
    completed: text('completed'),
    inProgress: text('in_progress'),
    blockers: text('blockers'),
    plansTomorrow: text('plans_tomorrow'),
    proofLinks: jsonb('proof_links').notNull().default(sql`'[]'::jsonb`),
    keptPromise: boolean('kept_promise'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    status: reportStatusEnum('status').notNull().default('missed'),
    hasProof: boolean('has_proof').notNull().default(false),
    wordCount: integer('word_count').notNull().default(0),
    forwardedMessageId: bigint('forwarded_message_id', { mode: 'bigint' }),
  },
  (t) => ({
    uniqDay: uniqueIndex('daily_reports_vibecoder_date_unique').on(t.vibecoderId, t.reportDate),
    dateIdx: index('daily_reports_date_idx').on(t.reportDate),
  }),
);

export const statusUpdates = pgTable(
  'status_updates',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    offlineSessionId: integer('offline_session_id').references(() => offlineModeLog.id, { onDelete: 'set null' }),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    currentTask: text('current_task').notNull(),
    sinceLast: text('since_last'),
    doingNow: text('doing_now'),
    blocker: text('blocker'),
    onTrack: boolean('on_track').notNull().default(true),
  },
  (t) => ({ vibecoderTimeIdx: index('status_vibecoder_time_idx').on(t.vibecoderId, t.sentAt) }),
);

export const dailyStandups = pgTable(
  'daily_standups',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    standupDate: date('standup_date').notNull(),
    completedYesterday: text('completed_yesterday').notNull(),
    willCompleteToday: text('will_complete_today').notNull(),
    mainDeadline: text('main_deadline'),
    blocker: text('blocker'),
    endOfDayDeliverable: text('end_of_day_deliverable').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqDay: uniqueIndex('standup_vibecoder_date_unique').on(t.vibecoderId, t.standupDate) }),
);

// ---------- Growth logs ----------
export const designRefs = pgTable(
  'design_refs',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    refUrl: text('ref_url').notNull(),
    refImageUrl: text('ref_image_url'),
    observations: jsonb('observations').notNull(), // string[] (>=3 enforced by service)
    appliedInTask: text('applied_in_task'),
    notionPageId: varchar('notion_page_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byVc: index('design_refs_vc_idx').on(t.vibecoderId, t.createdAt) }),
);

export const businessNotes = pgTable(
  'business_notes',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    sourceUrl: text('source_url').notNull(),
    sourceType: sourceTypeEnum('source_type').notNull().default('video'),
    fiveInsights: jsonb('five_insights').notNull(), // string[]
    crmErpConnection: text('crm_erp_connection').notNull(),
    clientPain: text('client_pain').notNull(),
    possibleSolution: text('possible_solution').notNull(),
    notionPageId: varchar('notion_page_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byVc: index('business_notes_vc_idx').on(t.vibecoderId, t.createdAt) }),
);

export const learningNotes = pgTable(
  'learning_notes',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    sourceUrl: text('source_url').notNull(),
    topic: varchar('topic', { length: 255 }).notNull(),
    threeTakeaways: jsonb('three_takeaways').notNull(), // string[]
    applicationText: text('application_text').notNull(),
    actionToTry: text('action_to_try').notNull(),
    notionPageId: varchar('notion_page_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byVc: index('learning_notes_vc_idx').on(t.vibecoderId, t.createdAt) }),
);

export const explainNotes = pgTable(
  'explain_notes',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    technicalVersion: text('technical_version').notNull(),
    simpleVersion: text('simple_version').notNull(),
    metaphor: text('metaphor').notNull(),
    businessValue: text('business_value').notNull(),
    notionPageId: varchar('notion_page_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byVc: index('explain_notes_vc_idx').on(t.vibecoderId, t.createdAt) }),
);

export const bookReflections = pgTable(
  'book_reflections',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    monthYear: varchar('month_year', { length: 7 }).notNull(), // 'YYYY-MM'
    bookTitle: varchar('book_title', { length: 255 }).notNull(),
    mainIdea: text('main_idea').notNull(),
    fiveThoughts: jsonb('five_thoughts').notNull(), // string[]
    communicationHelp: text('communication_help').notNull(),
    workApplication: text('work_application').notNull(),
    notionPageId: varchar('notion_page_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqMonth: uniqueIndex('book_reflections_vc_month_unique').on(t.vibecoderId, t.monthYear) }),
);

// ---------- Task lifecycle ----------
export const taskOwnershipBriefs = pgTable(
  'task_ownership_briefs',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    taskTitle: varchar('task_title', { length: 255 }).notNull(),
    understanding: text('understanding').notNull(),
    expectedResult: text('expected_result').notNull(),
    userFlow: text('user_flow').notNull(),
    steps: jsonb('steps').notNull(), // string[]
    selfDeadline: timestamp('self_deadline', { withTimezone: true }).notNull(),
    risks: text('risks'),
    openQuestions: text('open_questions'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    onTime: boolean('on_time'),
  },
  (t) => ({ byVc: index('briefs_vc_idx').on(t.vibecoderId, t.createdAt) }),
);

export const finalDeliveries = pgTable(
  'final_deliveries',
  {
    id: serial('id').primaryKey(),
    briefId: integer('brief_id').notNull().references(() => taskOwnershipBriefs.id, { onDelete: 'cascade' }),
    whatDone: text('what_done').notNull(),
    whatChanged: text('what_changed').notNull(),
    howToTest: text('how_to_test').notNull(),
    screenshots: jsonb('screenshots').notNull().default(sql`'[]'::jsonb`),
    videoDemoUrl: text('video_demo_url'),
    edgeCasesChecked: text('edge_cases_checked').notNull(),
    knownIssues: text('known_issues'),
    futureImprovements: text('future_improvements'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ briefUnique: uniqueIndex('deliveries_brief_unique').on(t.briefId) }),
);

// ---------- Weekly + monthly ----------
export const weeklyGrowthReviews = pgTable(
  'weekly_growth_reviews',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    weekStart: date('week_start').notNull(),
    designRefIds: jsonb('design_ref_ids').notNull().default(sql`'[]'::jsonb`),
    businessNoteId: integer('business_note_id').references(() => businessNotes.id, { onDelete: 'set null' }),
    learningNoteId: integer('learning_note_id').references(() => learningNotes.id, { onDelete: 'set null' }),
    explainNoteId: integer('explain_note_id').references(() => explainNotes.id, { onDelete: 'set null' }),
    improvementApplied: text('improvement_applied'),
    taskExample: text('task_example'),
    managerNotes: text('manager_notes'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqWeek: uniqueIndex('weekly_vc_week_unique').on(t.vibecoderId, t.weekStart) }),
);

export const monthlyScores = pgTable(
  'monthly_scores',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    yearMonth: varchar('year_month', { length: 7 }).notNull(), // 'YYYY-MM'
    deadlineOwnership: integer('deadline_ownership').notNull().default(0), // 0-25
    uxuiTaste: integer('uxui_taste').notNull().default(0), // 0-20
    businessThinking: integer('business_thinking').notNull().default(0), // 0-20
    professionalLearning: integer('professional_learning').notNull().default(0), // 0-15
    simpleExplanation: integer('simple_explanation').notNull().default(0), // 0-10
    disciplineReporting: integer('discipline_reporting').notNull().default(0), // 0-10
    total: integer('total').notNull().default(0),
    bonusTier: bonusTierEnum('bonus_tier'),
    bonusPaidUzs: bigint('bonus_paid_uzs', { mode: 'number' }).notNull().default(0),
    performanceDiscussionRequired: boolean('performance_discussion_required').notNull().default(false),
    pmNotes: text('pm_notes'),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqMonth: uniqueIndex('scores_vc_month_unique').on(t.vibecoderId, t.yearMonth) }),
);

export const scoreComponents = pgTable(
  'score_components',
  {
    id: serial('id').primaryKey(),
    monthlyScoreId: integer('monthly_score_id').notNull().references(() => monthlyScores.id, { onDelete: 'cascade' }),
    component: varchar('component', { length: 64 }).notNull(),
    autoValue: integer('auto_value').notNull(),
    manualOverride: integer('manual_override'),
    finalValue: integer('final_value').notNull(),
    formulaSnapshot: text('formula_snapshot').notNull(),
    notes: text('notes'),
  },
  (t) => ({ byScore: index('components_score_idx').on(t.monthlyScoreId) }),
);

// ---------- Bot ops ----------
export const botSessions = pgTable(
  'bot_sessions',
  {
    key: varchar('key', { length: 64 }).primaryKey(),
    state: jsonb('state').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({ expIdx: index('sessions_exp_idx').on(t.expiresAt) }),
);

export const botReminders = pgTable(
  'bot_reminders',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    kind: reminderKindEnum('kind').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    messageId: bigint('message_id', { mode: 'bigint' }),
  },
  (t) => ({ byVc: index('reminders_vc_idx').on(t.vibecoderId, t.scheduledFor) }),
);

// One rolling Telegram message per (vibecoder, calendar day). Every time
// a wizard saves new data, we re-render the card and edit this message in
// place — so a manager sees the whole day for one person in a single,
// growing post instead of hunting across topics or scrolling many DMs.
export const dailyCards = pgTable(
  'daily_cards',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    cardDate: date('card_date').notNull(),
    chatId: bigint('chat_id', { mode: 'bigint' }).notNull(),
    messageId: bigint('message_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqDay: uniqueIndex('daily_cards_vc_date_unique').on(t.vibecoderId, t.cardDate),
    byDate: index('daily_cards_date_idx').on(t.cardDate),
  }),
);

// ---------- Habit tracking ----------
// A row per (vibecoder, day, pillar) where a manager has explicitly marked
// progress. Absence = not yet evaluated. The dashboard treats 'done' as
// counting toward the monthly target; 'not_done' is recorded for audit but
// does not count. The `discipline_reporting` pillar is excluded — it is
// auto-derived from dailyReports.status.
export const habitMarks = pgTable(
  'habit_marks',
  {
    id: serial('id').primaryKey(),
    vibecoderId: integer('vibecoder_id').notNull().references(() => vibecoders.id, { onDelete: 'cascade' }),
    markDate: date('mark_date').notNull(),
    pillar: pillarEnum('pillar').notNull(),
    status: habitMarkStatusEnum('status').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqMark: uniqueIndex('habit_marks_vc_date_pillar_unique').on(t.vibecoderId, t.markDate, t.pillar),
    byVcDate: index('habit_marks_vc_date_idx').on(t.vibecoderId, t.markDate),
  }),
);

export const notionSyncQueue = pgTable(
  'notion_sync_queue',
  {
    id: serial('id').primaryKey(),
    entityTable: varchar('entity_table', { length: 64 }).notNull(),
    entityId: integer('entity_id').notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }).notNull().defaultNow(),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pending: index('sync_queue_pending_idx').on(t.syncedAt, t.nextRetryAt),
    entUnique: uniqueIndex('sync_queue_entity_unique').on(t.entityTable, t.entityId),
  }),
);

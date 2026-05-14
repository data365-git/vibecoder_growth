CREATE TYPE "public"."bonus_tier" AS ENUM('tier_100', 'tier_70', 'tier_40', 'tier_0');--> statement-breakpoint
CREATE TYPE "public"."reminder_kind" AS ENUM('standup', 'report_soft', 'report_final', 'status_offline', 'weekly_review', 'month_end');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('on_time', 'late', 'missed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('podcast', 'video', 'interview', 'article', 'other');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" varchar(32) DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_reflections" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"month_year" varchar(7) NOT NULL,
	"book_title" varchar(255) NOT NULL,
	"main_idea" text NOT NULL,
	"five_thoughts" jsonb NOT NULL,
	"communication_help" text NOT NULL,
	"work_application" text NOT NULL,
	"notion_page_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"kind" "reminder_kind" NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"message_id" bigint
);
--> statement-breakpoint
CREATE TABLE "bot_sessions" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"source_type" "source_type" DEFAULT 'video' NOT NULL,
	"five_insights" jsonb NOT NULL,
	"crm_erp_connection" text NOT NULL,
	"client_pain" text NOT NULL,
	"possible_solution" text NOT NULL,
	"notion_page_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"report_date" date NOT NULL,
	"did_today" text NOT NULL,
	"completed" text,
	"in_progress" text,
	"blockers" text,
	"plans_tomorrow" text,
	"proof_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"kept_promise" boolean,
	"submitted_at" timestamp with time zone,
	"status" "report_status" DEFAULT 'missed' NOT NULL,
	"has_proof" boolean DEFAULT false NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"forwarded_message_id" bigint
);
--> statement-breakpoint
CREATE TABLE "daily_standups" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"standup_date" date NOT NULL,
	"completed_yesterday" text NOT NULL,
	"will_complete_today" text NOT NULL,
	"main_deadline" text,
	"blocker" text,
	"end_of_day_deliverable" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_refs" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"ref_url" text NOT NULL,
	"ref_image_url" text,
	"observations" jsonb NOT NULL,
	"applied_in_task" text,
	"notion_page_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "explain_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"technical_version" text NOT NULL,
	"simple_version" text NOT NULL,
	"metaphor" text NOT NULL,
	"business_value" text NOT NULL,
	"notion_page_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"brief_id" integer NOT NULL,
	"what_done" text NOT NULL,
	"what_changed" text NOT NULL,
	"how_to_test" text NOT NULL,
	"screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_demo_url" text,
	"edge_cases_checked" text NOT NULL,
	"known_issues" text,
	"future_improvements" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"tg_user_id" bigint NOT NULL,
	"tg_username" varchar(64),
	"full_name_ru" varchar(255) NOT NULL,
	"can_toggle_offline" boolean DEFAULT true NOT NULL,
	"notify_channel_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"topic" varchar(255) NOT NULL,
	"three_takeaways" jsonb NOT NULL,
	"application_text" text NOT NULL,
	"action_to_try" text NOT NULL,
	"notion_page_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"year_month" varchar(7) NOT NULL,
	"deadline_ownership" integer DEFAULT 0 NOT NULL,
	"uxui_taste" integer DEFAULT 0 NOT NULL,
	"business_thinking" integer DEFAULT 0 NOT NULL,
	"professional_learning" integer DEFAULT 0 NOT NULL,
	"simple_explanation" integer DEFAULT 0 NOT NULL,
	"discipline_reporting" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"bonus_tier" "bonus_tier",
	"bonus_paid_uzs" bigint DEFAULT 0 NOT NULL,
	"performance_discussion_required" boolean DEFAULT false NOT NULL,
	"pm_notes" text,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notion_sync_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_table" varchar(64) NOT NULL,
	"entity_id" integer NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_mode_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" integer,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "score_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"monthly_score_id" integer NOT NULL,
	"component" varchar(64) NOT NULL,
	"auto_value" integer NOT NULL,
	"manual_override" integer,
	"final_value" integer NOT NULL,
	"formula_snapshot" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "status_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"offline_session_id" integer,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_task" text NOT NULL,
	"since_last" text,
	"doing_now" text,
	"blocker" text,
	"on_track" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_ownership_briefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"task_title" varchar(255) NOT NULL,
	"understanding" text NOT NULL,
	"expected_result" text NOT NULL,
	"user_flow" text NOT NULL,
	"steps" jsonb NOT NULL,
	"self_deadline" timestamp with time zone NOT NULL,
	"risks" text,
	"open_questions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"on_time" boolean
);
--> statement-breakpoint
CREATE TABLE "vibecoders" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"tg_user_id" bigint,
	"tg_username" varchar(64),
	"full_name_ru" varchar(255) NOT NULL,
	"role" varchar(64) DEFAULT 'vibecoder' NOT NULL,
	"start_date" date,
	"base_salary_uzs" bigint DEFAULT 0 NOT NULL,
	"bonus_baseline_uzs" bigint DEFAULT 0 NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Tashkent' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_growth_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"week_start" date NOT NULL,
	"design_ref_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"business_note_id" integer,
	"learning_note_id" integer,
	"explain_note_id" integer,
	"improvement_applied" text,
	"task_example" text,
	"manager_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "book_reflections" ADD CONSTRAINT "book_reflections_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_reminders" ADD CONSTRAINT "bot_reminders_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notes" ADD CONSTRAINT "business_notes_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_standups" ADD CONSTRAINT "daily_standups_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_refs" ADD CONSTRAINT "design_refs_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explain_notes" ADD CONSTRAINT "explain_notes_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_deliveries" ADD CONSTRAINT "final_deliveries_brief_id_task_ownership_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."task_ownership_briefs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_managers" ADD CONSTRAINT "growth_managers_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_notes" ADD CONSTRAINT "learning_notes_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_scores" ADD CONSTRAINT "monthly_scores_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_mode_log" ADD CONSTRAINT "offline_mode_log_manager_id_growth_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."growth_managers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_components" ADD CONSTRAINT "score_components_monthly_score_id_monthly_scores_id_fk" FOREIGN KEY ("monthly_score_id") REFERENCES "public"."monthly_scores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_updates" ADD CONSTRAINT "status_updates_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_updates" ADD CONSTRAINT "status_updates_offline_session_id_offline_mode_log_id_fk" FOREIGN KEY ("offline_session_id") REFERENCES "public"."offline_mode_log"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_ownership_briefs" ADD CONSTRAINT "task_ownership_briefs_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibecoders" ADD CONSTRAINT "vibecoders_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_growth_reviews" ADD CONSTRAINT "weekly_growth_reviews_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_growth_reviews" ADD CONSTRAINT "weekly_growth_reviews_business_note_id_business_notes_id_fk" FOREIGN KEY ("business_note_id") REFERENCES "public"."business_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_growth_reviews" ADD CONSTRAINT "weekly_growth_reviews_learning_note_id_learning_notes_id_fk" FOREIGN KEY ("learning_note_id") REFERENCES "public"."learning_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_growth_reviews" ADD CONSTRAINT "weekly_growth_reviews_explain_note_id_explain_notes_id_fk" FOREIGN KEY ("explain_note_id") REFERENCES "public"."explain_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "book_reflections_vc_month_unique" ON "book_reflections" USING btree ("vibecoder_id","month_year");--> statement-breakpoint
CREATE INDEX "reminders_vc_idx" ON "bot_reminders" USING btree ("vibecoder_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "sessions_exp_idx" ON "bot_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "business_notes_vc_idx" ON "business_notes" USING btree ("vibecoder_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reports_vibecoder_date_unique" ON "daily_reports" USING btree ("vibecoder_id","report_date");--> statement-breakpoint
CREATE INDEX "daily_reports_date_idx" ON "daily_reports" USING btree ("report_date");--> statement-breakpoint
CREATE UNIQUE INDEX "standup_vibecoder_date_unique" ON "daily_standups" USING btree ("vibecoder_id","standup_date");--> statement-breakpoint
CREATE INDEX "design_refs_vc_idx" ON "design_refs" USING btree ("vibecoder_id","created_at");--> statement-breakpoint
CREATE INDEX "explain_notes_vc_idx" ON "explain_notes" USING btree ("vibecoder_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_brief_unique" ON "final_deliveries" USING btree ("brief_id");--> statement-breakpoint
CREATE UNIQUE INDEX "managers_tg_user_unique" ON "growth_managers" USING btree ("tg_user_id");--> statement-breakpoint
CREATE INDEX "learning_notes_vc_idx" ON "learning_notes" USING btree ("vibecoder_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "scores_vc_month_unique" ON "monthly_scores" USING btree ("vibecoder_id","year_month");--> statement-breakpoint
CREATE INDEX "sync_queue_pending_idx" ON "notion_sync_queue" USING btree ("synced_at","next_retry_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_queue_entity_unique" ON "notion_sync_queue" USING btree ("entity_table","entity_id");--> statement-breakpoint
CREATE INDEX "offline_active_idx" ON "offline_mode_log" USING btree ("ended_at");--> statement-breakpoint
CREATE INDEX "components_score_idx" ON "score_components" USING btree ("monthly_score_id");--> statement-breakpoint
CREATE INDEX "status_vibecoder_time_idx" ON "status_updates" USING btree ("vibecoder_id","sent_at");--> statement-breakpoint
CREATE INDEX "briefs_vc_idx" ON "task_ownership_briefs" USING btree ("vibecoder_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vibecoders_tg_user_unique" ON "vibecoders" USING btree ("tg_user_id");--> statement-breakpoint
CREATE INDEX "vibecoders_tg_username_idx" ON "vibecoders" USING btree ("tg_username");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_vc_week_unique" ON "weekly_growth_reviews" USING btree ("vibecoder_id","week_start");
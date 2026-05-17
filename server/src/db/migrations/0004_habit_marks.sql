DO $$ BEGIN
 CREATE TYPE "public"."habit_pillar" AS ENUM('discipline_reporting', 'uxui_taste', 'business_thinking', 'professional_learning', 'simple_explanation', 'deadline_ownership');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."habit_mark_status" AS ENUM('done', 'not_done');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"mark_date" date NOT NULL,
	"pillar" "habit_pillar" NOT NULL,
	"status" "habit_mark_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_marks" ADD CONSTRAINT "habit_marks_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "habit_marks_vc_date_pillar_unique" ON "habit_marks" USING btree ("vibecoder_id","mark_date","pillar");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_marks_vc_date_idx" ON "habit_marks" USING btree ("vibecoder_id","mark_date");

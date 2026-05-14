ALTER TABLE "growth_managers" ALTER COLUMN "tg_user_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "managers_tg_username_idx" ON "growth_managers" USING btree ("tg_username");
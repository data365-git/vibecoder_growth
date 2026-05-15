CREATE TABLE "daily_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"vibecoder_id" integer NOT NULL,
	"card_date" date NOT NULL,
	"chat_id" bigint NOT NULL,
	"message_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_cards" ADD CONSTRAINT "daily_cards_vibecoder_id_vibecoders_id_fk" FOREIGN KEY ("vibecoder_id") REFERENCES "public"."vibecoders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_cards_vc_date_unique" ON "daily_cards" USING btree ("vibecoder_id","card_date");--> statement-breakpoint
CREATE INDEX "daily_cards_date_idx" ON "daily_cards" USING btree ("card_date");
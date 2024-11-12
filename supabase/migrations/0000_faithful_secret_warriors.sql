CREATE TABLE IF NOT EXISTS "calendar_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"event_prompt" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"event_title" text,
	"event_start" timestamp,
	"event_end" timestamp,
	"event_description" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "users_select_own_events" ON "calendar_events" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = "calendar_events"."user_id");--> statement-breakpoint
CREATE POLICY "users_insert_own_events" ON "calendar_events" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = "calendar_events"."user_id");--> statement-breakpoint
CREATE POLICY "users_update_own_events" ON "calendar_events" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = "calendar_events"."user_id") WITH CHECK (auth.uid() = "calendar_events"."user_id");--> statement-breakpoint
CREATE POLICY "users_delete_own_events" ON "calendar_events" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = "calendar_events"."user_id");
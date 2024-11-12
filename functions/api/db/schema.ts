import { pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";

export const calendarEvents = pgTable(
	"calendar_events",
	{
		id: uuid("id").primaryKey(),
		userId: uuid("user_id").references(() => authUsers.id, {
			onDelete: "cascade",
		}),
		eventPrompt: text("event_prompt").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		eventTitle: text("event_title"),
		eventStart: timestamp("event_start"),
		eventEnd: timestamp("event_end"),
		eventDescription: text("event_description"),
	},
	(table) => [
		pgPolicy("users_select_own_events", {
			for: "select",
			using: sql`auth.uid() = ${table.userId}`,
		}),
		pgPolicy("users_insert_own_events", {
			for: "insert",
			withCheck: sql`auth.uid() = ${table.userId}`,
		}),
		pgPolicy("users_update_own_events", {
			for: "update",
			using: sql`auth.uid() = ${table.userId}`,
			withCheck: sql`auth.uid() = ${table.userId}`,
		}),
		pgPolicy("users_delete_own_events", {
			for: "delete",
			using: sql`auth.uid() = ${table.userId}`,
		}),
	],
);

export type NewUser = typeof authUsers.$inferInsert;
export type User = typeof authUsers.$inferSelect;

export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

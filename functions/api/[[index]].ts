import { instrument } from "@fiberplane/hono-otel";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import postgres from "postgres";
import {
	createClient,
	type User,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { calendarEvents } from "./db/schema";

import { runWithTools, tool } from "@cloudflare/ai-utils";
import { SYSTEM_PROMPT } from "./prompts";
import { z } from "zod";
import { handle } from "hono/cloudflare-pages";

type Bindings = {
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
};

type Variables = {
	supabase: SupabaseClient;
	user: User;
	db: PostgresJsDatabase;
};

const aiEventResponseSchema = z.object({
	title: z.string(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	description: z.string().optional(),
});

const app = new Hono<{
	Bindings: Bindings & Env;
	Variables: Variables;
}>();

const routes = app
	.use("*", async (c, next) => {
		const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
		c.set("supabase", supabase);

		const sql = postgres(c.env.DATABASE_URL);
		const db = drizzle(sql);
		c.set("db", db);

		await next();
	})
	.get("/login", async (c) => {
		const supabase = c.get("supabase");
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: "github",
		});
		if (error) {
			return c.json({ error: error.message }, 500);
		}

		return c.redirect(data.url);
	})
	.use("*", async (c, next) => {
		const supabase = c.get("supabase");
		const token = c.req.header("Authorization")?.replace("Bearer ", "");

		if (!token) {
			return c.json({ error: "No token provided" }, 401);
		}

		const { data, error } = await supabase.auth.getUser(token);

		if (error) {
			return c.json({ error: error.message }, 401);
		}

		c.set("user", data.user);

		await next();
	})
	.get("/events", async (c) => {
		const db = c.get("db");

		return c.json({
			events: await db.select().from(calendarEvents),
		});
	})
	.get("/events/:id", async (c) => {
		const db = c.get("db");
		const id = c.req.param("id");

		return c.json({
			event: await db
				.select()
				.from(calendarEvents)
				.where(eq(calendarEvents.id, id)),
		});
	})
	.post("/events", async (c) => {
		const prompt = await c.req.text();
		const ai = c.env.AI;
		const user = c.get("user");
		const db = c.get("db");

		const response = await runWithTools(
			ai,
			// @ts-expect-error for some reason the most recent models are not picked up in types
			"@cf/meta/llama-3.2-1b-instruct",
			{
				messages: [
					{
						content: SYSTEM_PROMPT,
						role: "system",
					},
					{
						content: `The current date and time is: ${new Date().toISOString()}`,
						role: "assistant",
					},
					{ content: prompt, role: "user" },
				],
				tools: [
					tool({
						name: "create_event",
						description:
							"Create a new calendar event with title, time, and description",
						parameters: {
							type: "object",
							required: ["title", "startTime", "endTime"],
							properties: {
								title: {
									type: "string",
									description: "The title of the event",
								},
								startTime: {
									type: "string",
									format: "date-time",
									description: "Start time of the event in ISO 8601 format",
								},
								endTime: {
									type: "string",
									format: "date-time",
									description: "End time of the event in ISO 8601 format",
								},
								description: {
									type: "string",
									description: "Detailed description of the event",
								},
							},
						},
					}),
				],
			},
			{ strictValidation: true },
		);
		try {
			console.log(response);
			const toolCall = response;
			if (!toolCall) {
				return c.json({ error: "AI did not generate an event" }, 400);
			}

			const validatedEvent = aiEventResponseSchema.parse(toolCall.response);

			const newEvent = await db
				.insert(calendarEvents)
				.values({
					id: crypto.randomUUID(),
					userId: user.id,
					eventPrompt: prompt,
					eventTitle: validatedEvent.title,
					eventStart: new Date(validatedEvent.startTime),
					eventEnd: new Date(validatedEvent.endTime),
					eventDescription: validatedEvent.description,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			return c.json({
				message: "Event created successfully",
				event: newEvent[0],
				aiResponse: response,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return c.json(
					{
						error: "Invalid AI response format",
						details: error.errors,
					},
					400,
				);
			}

			return c.json(
				{
					error: "Failed to create event",
					details: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	});
// .post("/events", async (c) => {
// 	const db = c.get("db");
// 	const event = await c.req.json();

// 	try {
// 		const newEvent = await db.insert(calendarEvents).values(event);
// 		return c.json({ event: newEvent });
// 	} catch (error) {
// 		return c.json({ error: error }, 500);
// 	}
// });

// debugger
// export const onRequest = handle(instrument(app));
export type AppType = typeof routes;
export const onRequest = handle(app);

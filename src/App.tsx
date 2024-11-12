import type { InferResponseType } from "hono/client";
import { hc } from "hono/client";
import type { AppType } from "../functions/api/[[index]]";
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Number.POSITIVE_INFINITY, // Prevent automatic refetching
			retry: false, // Disable retries
		},
	},
});

// Create client outside of components
const client = hc<AppType>("/api");

function EventsList() {
	const { data, error, isLoading } = useQuery({
		queryKey: ["events"],
		queryFn: async () => {
			const response = await client.events.$get({
				// Add headers if needed
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			return response.json();
		},
	});

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return (
			<div style={{ color: "red" }}>Error: {(error as Error).message}</div>
		);
	}

	return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<main>
				<h1>Supa Honc! 📯🪿📯🪿📯🪿📯</h1>
				<EventsList />
			</main>
		</QueryClientProvider>
	);
}

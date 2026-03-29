// Shared DB instance for Vercel API routes
// Re-uses a cached connection across warm function invocations
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../../lib/db/src/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

// Cached client — avoids re-connecting on every warm invocation
const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // required for Supabase transaction pooler
  max: 1,         // 1 connection per serverless function instance
});

export const db = drizzle(client, { schema });
export * from "../../../lib/db/src/schema";

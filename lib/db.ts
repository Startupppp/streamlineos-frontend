import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

// Fallback to dummy connection string to allow build to pass without env vars
// In production, this will fail connection if not set, which is expected.
if (!connectionString) {
  console.warn("⚠️  DATABASE_URL is not set. Using placeholder connection string. DB operations will fail.");
}
const safeConnectionString = connectionString || "postgres://user:pass@localhost:5432/db_placeholder";

import * as schema from "./db/schema";

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(safeConnectionString, { prepare: false });
export const db = drizzle(client, { schema });

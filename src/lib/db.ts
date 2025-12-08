import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

import * as schema from "./db/schema";

// Disable prefetch as it is not supported for "Transaction" pool mode which is common in Supabase
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

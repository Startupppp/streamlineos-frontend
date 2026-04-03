import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}

import * as schema from "./db/schema";

const isServerless = process.env.VERCEL === "1";

export const client = postgres(connectionString, {
  prepare: false,
  max: isServerless ? 10 : 75,
  idle_timeout: isServerless ? 10 : 30,
  connect_timeout: 15,
});
export const db = drizzle(client, { schema });

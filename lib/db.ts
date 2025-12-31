import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
}
const safeConnectionString = connectionString || "postgres://user:pass@localhost:5432/db_placeholder";

import * as schema from "./db/schema";

export const client = postgres(safeConnectionString, { prepare: false });
export const db = drizzle(client, { schema });

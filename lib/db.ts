import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./db/schema";

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL environment variable is required.");
}

/** Neon pooler + postgres.js often fail TLS when `channel_binding=require` is set. */
function normalizeDatabaseUrl(url: string): string {
  if (!/\.neon\.tech/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url.replace(/[&?]channel_binding=[^&]*/g, "").replace(/\?&/, "?");
  }
}

const connectionString = normalizeDatabaseUrl(rawDatabaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __postgresClient?: ReturnType<typeof postgres>;
};

const isNeonHost = /\.neon\.tech/i.test(connectionString);
const isDev = process.env.NODE_ENV === "development";
const isServerless = process.env.VERCEL === "1";

const max = isServerless ? 10 : isDev ? 5 : 25;

function createPostgresClient() {
  return postgres(connectionString, {
    prepare: false,
    max,
    idle_timeout: isServerless ? 10 : isDev ? 20 : 30,
    // Neon cold start / slow networks; 10s dev timeout caused CONNECT_TIMEOUT storms.
    connect_timeout: isNeonHost ? 60 : 30,
    ...(isNeonHost ? { ssl: "require" as const } : {}),
  });
}

export const client = (globalForDb.__postgresClient ??= createPostgresClient());
export const db = drizzle(client, { schema });

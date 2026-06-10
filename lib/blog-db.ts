import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  blogAuthors,
  blogCategories,
  blogPosts,
  blogAuthorsRelations,
  blogCategoriesRelations,
  blogPostsRelations,
} from "./db/schema/blog";

const blogSchema = {
  blogAuthors,
  blogCategories,
  blogPosts,
  blogAuthorsRelations,
  blogCategoriesRelations,
  blogPostsRelations,
};

const rawBlogUrl =
  process.env.BLOGS_DB ?? process.env.DATABASE_URL ?? process.env.DB;

if (!rawBlogUrl) {
  throw new Error(
    "BLOGS_DB (or DATABASE_URL / DB) environment variable is required.",
  );
}

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

const connectionString = normalizeDatabaseUrl(rawBlogUrl);

const globalForBlogDb = globalThis as typeof globalThis & {
  __blogPostgresClient?: ReturnType<typeof postgres>;
};

const isNeonHost = /\.neon\.tech/i.test(connectionString);
const isDev = process.env.NODE_ENV === "development";
const isServerless = process.env.VERCEL === "1";

const max = isServerless ? 10 : isDev ? 5 : 40;

function createBlogPostgresClient() {
  return postgres(connectionString, {
    prepare: false,
    max,
    idle_timeout: isServerless ? 10 : isDev ? 20 : 60,
    connect_timeout: isNeonHost ? 60 : 30,
    max_lifetime: isServerless ? 60 * 5 : 60 * 30,
    ...(isNeonHost ? { ssl: "require" as const } : {}),
  });
}

export const blogClient = (globalForBlogDb.__blogPostgresClient ??=
  createBlogPostgresClient());
export const blogDb = drizzle(blogClient, { schema: blogSchema });

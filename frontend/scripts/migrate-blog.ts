

process.env.DATABASE_URL ??= process.env.DB;

const DDL = `
DO $$ BEGIN
  CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "blog_authors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(200) NOT NULL,
  "email" varchar(320),
  "avatar" text,
  "bio" text,
  "role" varchar(100),
  "twitter" varchar(100),
  "linkedin" varchar(200),
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "blog_authors_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "blog_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "description" text,
  "color" varchar(7),
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "blog_categories_name_unique" UNIQUE("name"),
  CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(256) NOT NULL,
  "slug" varchar(256) NOT NULL,
  "excerpt" text NOT NULL,
  "content" text NOT NULL,
  "content_json" jsonb,
  "cover_image" text NOT NULL,
  "category_id" uuid,
  "author_id" uuid,
  "status" "blog_post_status" DEFAULT 'draft' NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "reading_time" integer,
  "meta_title" varchar(256),
  "meta_description" varchar(320),
  "published_at" timestamp,
  "tags" text[] DEFAULT '{}',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);

DO $$ BEGIN
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk"
    FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_blog_authors_id_fk"
    FOREIGN KEY ("author_id") REFERENCES "public"."blog_authors"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "idx_blog_authors_name" ON "blog_authors" ("name");
CREATE INDEX IF NOT EXISTS "idx_blog_categories_slug" ON "blog_categories" ("slug");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_slug" ON "blog_posts" ("slug");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_status" ON "blog_posts" ("status");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_category" ON "blog_posts" ("category_id");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_author" ON "blog_posts" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_published_at" ON "blog_posts" ("published_at");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_status_published" ON "blog_posts" ("status", "published_at" DESC);
`;

async function main() {
  const { blogClient } = await import("../lib/blog-db");
  console.log("📦 Applying blog schema to the blog database (BLOGS_DB)…");
  await blogClient.unsafe(DDL);
  console.log("✅ Blog tables ready (blog_authors, blog_categories, blog_posts).");
  await blogClient.end({ timeout: 5 });
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Blog migration failed:", err);
  process.exit(1);
});

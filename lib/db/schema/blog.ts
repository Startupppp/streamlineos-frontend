import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

import { blogPostStatusEnum } from "./enums";

/**
 * Public marketing blog. Posts are global (not org-scoped) because the public
 * `/blogs` URL has no organization context. Authorship is a standalone
 * `blog_authors` table so the blog is self-contained and does not depend on the
 * app's `users`/auth schema.
 */

export const blogAuthors = pgTable(
  "blog_authors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }).unique(),
    avatar: text("avatar"),
    bio: text("bio"),
    role: varchar("role", { length: 100 }),
    twitter: varchar("twitter", { length: 100 }),
    linkedin: varchar("linkedin", { length: 200 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_blog_authors_name").on(table.name)],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    // Hex color used for category badges, e.g. "#3B82F6".
    color: varchar("color", { length: 7 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_blog_categories_slug").on(table.slug)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull().unique(),
    excerpt: text("excerpt").notNull(),
    // Rendered HTML (from TipTap getHTML) shown on the public post page.
    content: text("content").notNull(),
    // TipTap document JSON — source of truth re-loaded into the editor.
    contentJson: jsonb("content_json").$type<Record<string, unknown>>(),
    // R2 object key or absolute URL for the hero image.
    coverImage: text("cover_image").notNull(),
    categoryId: uuid("category_id").references(() => blogCategories.id, {
      onDelete: "set null",
    }),
    authorId: uuid("author_id").references(() => blogAuthors.id, {
      onDelete: "set null",
    }),
    status: blogPostStatusEnum("status").default("draft").notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    // Estimated reading time in minutes.
    readingTime: integer("reading_time"),
    metaTitle: varchar("meta_title", { length: 256 }),
    metaDescription: varchar("meta_description", { length: 320 }),
    publishedAt: timestamp("published_at"),
    tags: text("tags").array().default([]),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_blog_posts_slug").on(table.slug),
    index("idx_blog_posts_status").on(table.status),
    index("idx_blog_posts_category").on(table.categoryId),
    index("idx_blog_posts_author").on(table.authorId),
    index("idx_blog_posts_published_at").on(table.publishedAt),
    // Main public listing query: published posts newest-first.
    index("idx_blog_posts_status_published").on(table.status, table.publishedAt.desc()),
  ],
);

export const blogAuthorsRelations = relations(blogAuthors, ({ many }) => ({
  posts: many(blogPosts),
}));

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPosts),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  category: one(blogCategories, {
    fields: [blogPosts.categoryId],
    references: [blogCategories.id],
  }),
  author: one(blogAuthors, {
    fields: [blogPosts.authorId],
    references: [blogAuthors.id],
  }),
}));

export type BlogAuthor = InferSelectModel<typeof blogAuthors>;
export type NewBlogAuthor = InferInsertModel<typeof blogAuthors>;
export type BlogCategory = InferSelectModel<typeof blogCategories>;
export type NewBlogCategory = InferInsertModel<typeof blogCategories>;
export type BlogPost = InferSelectModel<typeof blogPosts>;
export type NewBlogPost = InferInsertModel<typeof blogPosts>;

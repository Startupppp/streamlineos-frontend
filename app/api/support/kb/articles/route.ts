import { type NextRequest } from "next/server";
import { withAbility, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles } from "@/lib/db/schema";
import { and, eq, ilike, or, desc, type SQL } from "drizzle-orm";
import { slugify } from "@/lib/format-utils";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["draft", "published", "archived"]).optional(),
  visibility: z.enum(["public", "internal"]).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

const createSchema = z.object({
  title: z.string().min(1).max(300),
  categoryId: z.number().int().positive().nullable().optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  visibility: z.enum(["public", "internal"]).default("internal"),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

async function uniqueArticleSlug(orgId: string, base: string): Promise<string> {
  const root = slugify(base) || "article";
  let slug = root;
  let suffix = 1;
  while (true) {
    const existing = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.orgId, orgId), eq(kbArticles.slug, slug)),
      columns: { id: true },
    });
    if (!existing) return slug;
    suffix += 1;
    slug = `${root}-${suffix}`;
  }
}

export async function GET(req: NextRequest) {
  return withAbility("view", "support:kb", async (session) => {
    const query = parseQuery(req, querySchema);

    const conditions: SQL[] = [eq(kbArticles.orgId, session.orgId)];
    if (query.status) conditions.push(eq(kbArticles.status, query.status));
    if (query.visibility) conditions.push(eq(kbArticles.visibility, query.visibility));
    if (query.categoryId) conditions.push(eq(kbArticles.categoryId, query.categoryId));
    if (query.search) {
      const term = `%${query.search}%`;
      const match = or(ilike(kbArticles.title, term), ilike(kbArticles.excerpt, term));
      if (match) conditions.push(match);
    }

    const articles = await db
      .select({
        id: kbArticles.id,
        orgId: kbArticles.orgId,
        categoryId: kbArticles.categoryId,
        title: kbArticles.title,
        slug: kbArticles.slug,
        excerpt: kbArticles.excerpt,
        status: kbArticles.status,
        visibility: kbArticles.visibility,
        authorId: kbArticles.authorId,
        views: kbArticles.views,
        helpfulCount: kbArticles.helpfulCount,
        notHelpfulCount: kbArticles.notHelpfulCount,
        tags: kbArticles.tags,
        publishedAt: kbArticles.publishedAt,
        createdAt: kbArticles.createdAt,
        updatedAt: kbArticles.updatedAt,
      })
      .from(kbArticles)
      .where(and(...conditions))
      .orderBy(desc(kbArticles.updatedAt));

    return ok(articles);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "support:kb", async (session) => {
    const input = await parseBody(req, createSchema);
    const slug = await uniqueArticleSlug(session.orgId, input.title);

    const [article] = await db
      .insert(kbArticles)
      .values({
        orgId: session.orgId,
        categoryId: input.categoryId ?? null,
        title: input.title,
        slug,
        excerpt: input.excerpt ?? null,
        content: input.content ?? "",
        status: input.status,
        visibility: input.visibility,
        authorId: session.user.id,
        tags: input.tags ?? null,
        publishedAt: input.status === "published" ? new Date() : null,
      })
      .returning();

    return ok(article, 201);
  });
}

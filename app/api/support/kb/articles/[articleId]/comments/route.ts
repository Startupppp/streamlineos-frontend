import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles, kbArticleComments, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(5000),
});

type RouteContext = { params: Promise<{ articleId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "support:kb", async (session) => {
    const { articleId: idStr } = await ctx.params;
    const articleId = Number(idStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);

    const article = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!article) return err("Article not found", 404);

    const rows = await db
      .select({
        id: kbArticleComments.id,
        articleId: kbArticleComments.articleId,
        body: kbArticleComments.body,
        userId: kbArticleComments.userId,
        userName: users.name,
        userImage: users.image,
        createdAt: kbArticleComments.createdAt,
        updatedAt: kbArticleComments.updatedAt,
      })
      .from(kbArticleComments)
      .leftJoin(users, eq(kbArticleComments.userId, users.id))
      .where(
        and(
          eq(kbArticleComments.articleId, articleId),
          eq(kbArticleComments.orgId, session.orgId)
        )
      )
      .orderBy(desc(kbArticleComments.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:kb", async (session) => {
    const { articleId: idStr } = await ctx.params;
    const articleId = Number(idStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);

    const article = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!article) return err("Article not found", 404);

    const input = await parseBody(req, createSchema);

    const [inserted] = await db
      .insert(kbArticleComments)
      .values({
        orgId: session.orgId,
        articleId,
        userId: session.user.id,
        body: input.body,
      })
      .returning();

    return ok(
      {
        id: inserted.id,
        articleId: inserted.articleId,
        body: inserted.body,
        userId: inserted.userId,
        userName: session.user.name ?? null,
        userImage: session.user.image ?? null,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
      },
      201
    );
  });
}

import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles, kbArticleFeedback } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

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

    const feedback = await db
      .select({
        id: kbArticleFeedback.id,
        articleId: kbArticleFeedback.articleId,
        helpful: kbArticleFeedback.helpful,
        comment: kbArticleFeedback.comment,
        visitorId: kbArticleFeedback.visitorId,
        createdAt: kbArticleFeedback.createdAt,
      })
      .from(kbArticleFeedback)
      .where(and(eq(kbArticleFeedback.articleId, articleId), eq(kbArticleFeedback.orgId, session.orgId)))
      .orderBy(desc(kbArticleFeedback.createdAt));

    return ok(feedback);
  });
}

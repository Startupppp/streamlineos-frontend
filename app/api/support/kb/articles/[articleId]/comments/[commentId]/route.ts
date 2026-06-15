import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticleComments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ articleId: string; commentId: string }>;
};

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:kb", async (session) => {
    const { articleId: articleIdStr, commentId: commentIdStr } = await ctx.params;
    const articleId = Number(articleIdStr);
    const commentId = Number(commentIdStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);
    if (!Number.isFinite(commentId)) return err("Invalid comment ID", 400);

    const [deleted] = await db
      .delete(kbArticleComments)
      .where(
        and(
          eq(kbArticleComments.id, commentId),
          eq(kbArticleComments.articleId, articleId),
          eq(kbArticleComments.orgId, session.orgId)
        )
      )
      .returning();

    if (!deleted) return err("Comment not found", 404);
    return ok({ success: true });
  });
}

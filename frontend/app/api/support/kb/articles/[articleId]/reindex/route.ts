import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { indexArticle } from "@/lib/services/kb-rag";
import { isEmbeddingConfigured } from "@/lib/ai/embeddings";

type RouteContext = { params: Promise<{ articleId: string }> };

export async function POST(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:kb", async (session) => {
    const { articleId: idStr } = await ctx.params;
    const articleId = Number(idStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);

    if (!isEmbeddingConfigured()) {
      return err("AI assistant is not configured", 503);
    }

    const article = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!article) return err("Article not found", 404);

    const result = await indexArticle(session.orgId, articleId);
    return ok(result);
  });
}

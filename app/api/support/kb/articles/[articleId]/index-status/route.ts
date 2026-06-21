import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { getArticleIndexStatus } from "@/lib/services/kb-rag";

type RouteContext = { params: Promise<{ articleId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "support:kb", async (session) => {
    const { articleId: idStr } = await ctx.params;
    const articleId = Number(idStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);

    const status = await getArticleIndexStatus(session.orgId, articleId);
    return ok(status);
  });
}

import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles, kbArticleFeedback } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({ org: z.string().min(1) });

const bodySchema = z.object({
  helpful: z.boolean(),
  comment: z.string().max(1000).optional(),
  visitorId: z.string().max(100).optional(),
});

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsedQuery.success) return err("Invalid request", 400);
  const { org } = parsedQuery.data;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return err("Invalid request body", 400);
  }
  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) return err("Validation failed", 400);
  const { helpful, comment, visitorId } = parsedBody.data;

  const [article] = await db
    .select({ id: kbArticles.id })
    .from(kbArticles)
    .where(
      and(
        eq(kbArticles.orgId, org),
        eq(kbArticles.slug, slug),
        eq(kbArticles.status, "published"),
        eq(kbArticles.visibility, "public"),
      ),
    );

  if (!article) return err("Article not found", 404);

  await db.transaction(async (tx) => {
    await tx.insert(kbArticleFeedback).values({
      orgId: org,
      articleId: article.id,
      helpful,
      comment: comment ?? null,
      visitorId: visitorId ?? null,
    });
    await tx
      .update(kbArticles)
      .set(
        helpful
          ? { helpfulCount: sql`${kbArticles.helpfulCount} + 1` }
          : { notHelpfulCount: sql`${kbArticles.notHelpfulCount} + 1` },
      )
      .where(eq(kbArticles.id, article.id));
  });

  return ok({ success: true }, 201);
}

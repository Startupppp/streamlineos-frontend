import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles, kbArticleAttachments } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getFileUrl, isStorageConfigured } from "@/lib/storage";
import { z } from "zod";

const querySchema = z.object({ org: z.string().min(1) });

const DOWNLOAD_EXPIRY_SECONDS = 3600;

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) return err("Invalid request", 400);
  const { org } = parsed.data;

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

  const rows = await db
    .select({
      id: kbArticleAttachments.id,
      fileName: kbArticleAttachments.fileName,
      fileKey: kbArticleAttachments.fileKey,
      fileSize: kbArticleAttachments.fileSize,
      mimeType: kbArticleAttachments.mimeType,
      createdAt: kbArticleAttachments.createdAt,
    })
    .from(kbArticleAttachments)
    .where(
      and(
        eq(kbArticleAttachments.articleId, article.id),
        eq(kbArticleAttachments.orgId, org),
      ),
    )
    .orderBy(desc(kbArticleAttachments.createdAt));

  const storageReady = isStorageConfigured();

  const attachments = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      fileName: row.fileName,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      createdAt: row.createdAt,
      downloadUrl: storageReady
        ? await getFileUrl(row.fileKey, DOWNLOAD_EXPIRY_SECONDS)
        : null,
    })),
  );

  return ok(attachments);
}

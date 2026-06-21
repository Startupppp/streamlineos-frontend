import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles, kbArticleAttachments } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { reindexArticleSafe } from "@/lib/services/kb-rag";
import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

const createSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required").max(255),
  fileKey: z.string().trim().min(1, "File key is required").max(1024),
  fileUrl: z.string().trim().max(2048).optional(),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, "File too large (max 10MB)"),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    message: "Unsupported file type. Allowed: PDF, images, Word, Excel.",
  }),
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
        id: kbArticleAttachments.id,
        articleId: kbArticleAttachments.articleId,
        fileName: kbArticleAttachments.fileName,
        fileSize: kbArticleAttachments.fileSize,
        mimeType: kbArticleAttachments.mimeType,
        uploadedBy: kbArticleAttachments.uploadedBy,
        createdAt: kbArticleAttachments.createdAt,
      })
      .from(kbArticleAttachments)
      .where(
        and(
          eq(kbArticleAttachments.articleId, articleId),
          eq(kbArticleAttachments.orgId, session.orgId),
        ),
      )
      .orderBy(desc(kbArticleAttachments.createdAt));

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
      .insert(kbArticleAttachments)
      .values({
        orgId: session.orgId,
        articleId,
        fileName: input.fileName,
        fileKey: input.fileKey,
        fileUrl: input.fileUrl ?? null,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        uploadedBy: session.user.id,
      })
      .returning({
        id: kbArticleAttachments.id,
        articleId: kbArticleAttachments.articleId,
        fileName: kbArticleAttachments.fileName,
        fileSize: kbArticleAttachments.fileSize,
        mimeType: kbArticleAttachments.mimeType,
        uploadedBy: kbArticleAttachments.uploadedBy,
        createdAt: kbArticleAttachments.createdAt,
      });

    await reindexArticleSafe(session.orgId, articleId);

    return ok(inserted, 201);
  });
}

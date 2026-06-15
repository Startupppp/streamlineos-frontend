import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticleAttachments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getFileUrl, deleteFile, isStorageConfigured } from "@/lib/storage";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ articleId: string; attachmentId: string }>;
};

const DOWNLOAD_EXPIRY_SECONDS = 3600;

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "support:kb", async (session) => {
    const { articleId: articleIdStr, attachmentId: attachmentIdStr } = await ctx.params;
    const articleId = Number(articleIdStr);
    const attachmentId = Number(attachmentIdStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);
    if (!Number.isFinite(attachmentId)) return err("Invalid attachment ID", 400);

    if (!isStorageConfigured()) return err("File storage is not available", 503);

    const attachment = await db.query.kbArticleAttachments.findFirst({
      where: and(
        eq(kbArticleAttachments.id, attachmentId),
        eq(kbArticleAttachments.articleId, articleId),
        eq(kbArticleAttachments.orgId, session.orgId),
      ),
      columns: { fileKey: true, fileName: true },
    });
    if (!attachment) return err("Attachment not found", 404);

    const url = await getFileUrl(attachment.fileKey, DOWNLOAD_EXPIRY_SECONDS);
    return ok({ url, fileName: attachment.fileName });
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:kb", async (session) => {
    const { articleId: articleIdStr, attachmentId: attachmentIdStr } = await ctx.params;
    const articleId = Number(articleIdStr);
    const attachmentId = Number(attachmentIdStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);
    if (!Number.isFinite(attachmentId)) return err("Invalid attachment ID", 400);

    const [deleted] = await db
      .delete(kbArticleAttachments)
      .where(
        and(
          eq(kbArticleAttachments.id, attachmentId),
          eq(kbArticleAttachments.articleId, articleId),
          eq(kbArticleAttachments.orgId, session.orgId),
        ),
      )
      .returning({ fileKey: kbArticleAttachments.fileKey });

    if (!deleted) return err("Attachment not found", 404);

    if (isStorageConfigured()) {
      try {
        await deleteFile(deleted.fileKey);
      } catch (error) {
        logger.error("Failed to delete KB attachment from storage", {
          fileKey: deleted.fileKey,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }

    return ok({ success: true });
  });
}

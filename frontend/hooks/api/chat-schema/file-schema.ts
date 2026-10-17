import { z } from "zod";

/** `chatLinkPreviewSchema` */
export const chatLinkPreviewContract = z.object({
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  siteName: z.string().nullable(),
});

/** `chatSignedUrlSchema` — attachment pre-signed URL. */
export const chatAttachmentUrlContract = z.object({ url: z.string() });

/**
 * `channelFilesResponseSchema`
 *
 * No `fileUrl`. `listChannelFiles` does not project it — the column is written
 * empty on every insert, and a chat attachment is fetched through
 * `GET /chat/channels/:id/attachments/:attachmentId/url`. Requiring it here
 * refused every non-empty page with `files.0.fileUrl: expected string, received
 * undefined`, so the Shared Files panel showed "Couldn't load shared files" over
 * attachments that had uploaded fine (CHAT-001).
 */
export const chatChannelFilesContract = z.object({
  files: z.array(
    z.object({
      id: z.number().int(),
      messageId: z.number().int(),
      fileName: z.string(),
      fileKey: z.string(),
      fileSize: z.number().int(),
      mimeType: z.string(),
      createdAt: z.string(),
    }),
  ),
  nextCursor: z.number().int().nullable().optional(),
});

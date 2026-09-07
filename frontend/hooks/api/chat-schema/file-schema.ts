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

/** `channelFilesResponseSchema` */
export const chatChannelFilesContract = z.object({
  files: z.array(
    z.object({
      id: z.number().int(),
      messageId: z.number().int(),
      fileName: z.string(),
      fileUrl: z.string(),
      fileKey: z.string(),
      fileSize: z.number().int(),
      mimeType: z.string(),
      uploadedAt: z.string(),
      uploadedBy: z.object({ id: z.string(), name: z.string().nullable() }),
    }),
  ),
  nextCursor: z.number().int().optional(),
});

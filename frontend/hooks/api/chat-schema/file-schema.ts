import { z } from "zod";

export const chatLinkPreviewContract = z.object({
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  siteName: z.string().nullable(),
});

export const chatAttachmentUrlContract = z.object({ url: z.string() });

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

import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";
import { kbPageContract } from "./kb-pages-schema";

export const kbFileVersionContract = z
  .object({
    id: z.string().uuid(),
    orgId: z.string(),
    pageId: z.number().int(),
    versionNumber: z.number().int(),
    fileKey: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    byteSize: z.number().int(),
    sha256: z.string().nullable(),
    extractionState: z.enum([
      "pending",
      "processing",
      "ready",
      "unsupported",
      "failed",
    ]),
    extractionError: z.string().nullable(),
    extractedAt: z.string().nullable(),
    createdByMembershipId: z.number().int().nullable(),
    createdAt: z.string(),
  })
  .strict();
export type KbFileVersion = z.infer<typeof kbFileVersionContract>;

export const kbFilePreviewKindContract = z.enum([
  "inline",
  "text",
  "unsupported",
  "quarantined",
  "processing",
]);
export type KbFilePreviewKind = z.infer<typeof kbFilePreviewKindContract>;

export const kbFileDetailContract = z
  .object({
    page: kbPageContract,
    currentVersion: kbFileVersionContract.nullable(),
    scanState: z.enum(["pending_scan", "clean", "infected", "error"]).nullable(),
    previewKind: kbFilePreviewKindContract,
  })
  .strict();
export type KbFileDetail = z.infer<typeof kbFileDetailContract>;

export const kbFileVersionListContract = cursorPageContract(kbFileVersionContract);

export const kbFileDownloadUrlContract = z
  .object({
    url: z.string().url(),
    expiresAt: z.string(),
  })
  .strict();
export type KbFileDownloadUrl = z.infer<typeof kbFileDownloadUrlContract>;

export const kbUploadFileResponseContract = z
  .object({
    page: kbPageContract,
    version: kbFileVersionContract,
  })
  .strict();
export type KbUploadFileResponse = z.infer<typeof kbUploadFileResponseContract>;

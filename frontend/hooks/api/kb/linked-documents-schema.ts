import { z } from "zod";

const status = z.enum(["active", "unpublished", "source_removed"]);

const linkedDocumentItemContract = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  documentType: z.string().nullable(),
  effectiveDate: z.string().nullable(),
  version: z.number().int().nullable(),
  publishedAt: z.string(),
  source: z.literal("HR_DOCUMENT"),
  hasFile: z.boolean(),
  fileName: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  mimeType: z.string().nullable(),
  status,
  versionMode: z.enum(["FOLLOW_LATEST", "PINNED"]),
  pinnedVersion: z.number().int().nullable(),
});

export const linkedDocumentListContract = z.object({
  data: z.array(linkedDocumentItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const linkedDocumentDetailContract = linkedDocumentItemContract.extend({
  audiences: z
    .array(z.object({ kind: z.enum(["ALL_EMPLOYEES", "DEPARTMENT", "LOCATION"]), refId: z.string().nullable(), label: z.string().nullable() }))
    .nullable(),
  newerVersionAvailable: z.boolean().nullable(),
  unpublishReason: z.string().nullable(),
});

export const openLinkedDocumentContract = z.object({
  url: z.string(),
  fileName: z.string(),
  expiresIn: z.number().int(),
});

const flags = z.object({ link: z.boolean(), search: z.boolean(), ai: z.boolean() });

export const hrKbLinkFlagsAdminContract = z.object({
  stored: flags,
  effective: flags,
  hrModuleEnabled: z.boolean(),
});

import { z } from "zod";

const audience = z.object({ kind: z.enum(["ALL_EMPLOYEES", "DEPARTMENT", "LOCATION"]), refId: z.string().nullable(), label: z.string().nullable() });

export const publishBlockerCodeSchema = z.enum([
  "CLASSIFICATION_NOT_SHAREABLE",
  "BELONGS_TO_AN_EMPLOYEE",
  "TYPE_NOT_ALLOWED",
  "DOCUMENT_INACTIVE",
  "HIRING_ARTEFACT",
  "METADATA_HOLDS_PERSONAL_IDENTIFIER",
]);

export type PublishBlockerCode = z.infer<typeof publishBlockerCodeSchema>;

export type PublishBlocker =
  | { code: PublishBlockerCode; message: string; known: true }
  | { code: string; message: string; known: false };

export const documentKbLinkStateContract = z.object({
  documentId: z.number().int(),
  link: z
    .object({
      id: z.number().int(),
      status: z.enum(["active", "unpublished", "source_removed"]),
      versionMode: z.enum(["FOLLOW_LATEST", "PINNED"]),
      pinnedVersion: z.number().int().nullable(),
      audiences: z.array(audience),
      publishedAt: z.string(),
      unpublishedAt: z.string().nullable(),
      unpublishReason: z.string().nullable(),
      newerVersionAvailable: z.boolean(),
    })
    .nullable(),
  publishable: z.boolean(),
  blockers: z.array(z.object({ code: z.string(), message: z.string() })).transform(
    (raw): PublishBlocker[] =>
      raw.map((item): PublishBlocker => {
        const result = publishBlockerCodeSchema.safeParse(item.code);
        if (result.success) {
          return { code: result.data, message: item.message, known: true };
        }
        return { code: item.code, message: item.message, known: false };
      }),
  ),
  documentAudiences: z.array(audience),
});

export const documentVersionsContract = z.object({
  documentId: z.number().int(),
  currentVersion: z.number().int(),
  versions: z.array(
    z.object({
      version: z.number().int(),
      status: z.enum(["pending", "approved", "rejected"]),
      fileName: z.string().nullable(),
      fileSize: z.number().int().nullable(),
      mimeType: z.string().nullable(),
      effectiveDate: z.string().nullable(),
      approvedAt: z.string().nullable(),
      isCurrent: z.boolean(),
    }),
  ),
});

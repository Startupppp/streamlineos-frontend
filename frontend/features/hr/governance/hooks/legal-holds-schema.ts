import { z } from "zod";

const cursorPaginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const legalHoldContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  subjectUserId: z.string().nullable(),
  subjectMembershipId: z.number().int().nullable(),
  reason: z.string(),
  status: z.enum(["active", "released"]),
  placedBy: z.string().nullable(),
  placedAt: z.string(),
  releasedBy: z.string().nullable(),
  releasedAt: z.string().nullable(),
  restrictedExport: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const legalHoldListContract = z.object({
  data: z.array(legalHoldContract),
  pagination: cursorPaginationContract,
});

export const holdItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  holdId: z.number().int(),
  itemType: z.enum(["employee_profile", "document", "case_evidence"]),
  itemRef: z.string(),
  locked: z.boolean(),
  createdAt: z.string(),
});

export const holdItemListContract = z.array(holdItemContract);

export type LegalHoldResponse = z.infer<typeof legalHoldContract>;
export type HoldItemResponse = z.infer<typeof holdItemContract>;

export const holdDeleteContract = z.undefined();

import { z } from "zod";

const cursorPaginationContract = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const unionMembershipContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  unionName: z.string(),
  memberSince: z.string(),
  status: z.enum(["active", "inactive"]),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const unionMembershipListContract = z.object({
  data: z.array(unionMembershipContract),
  pagination: cursorPaginationContract,
});

export const collectiveAgreementContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  unionName: z.string(),
  title: z.string(),
  effectiveFrom: z.string(),
  expiresAt: z.string().nullable(),
  documentUrl: z.string().nullable(),
  status: z.enum(["active", "expired", "negotiating"]),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const collectiveAgreementListContract = z.object({
  data: z.array(collectiveAgreementContract),
  pagination: cursorPaginationContract,
});

export const expiringAgreementsListContract = z.object({
  data: z.array(collectiveAgreementContract),
  daysWindow: z.number().int(),
});

export const laborCaseContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  unionName: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.enum(["open", "in_review", "resolved"]),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const laborCaseListContract = z.object({
  data: z.array(laborCaseContract),
  pagination: cursorPaginationContract,
});

export type UnionMembershipResponse = z.infer<typeof unionMembershipContract>;
export type CollectiveAgreementResponse = z.infer<typeof collectiveAgreementContract>;
export type LaborCaseResponse = z.infer<typeof laborCaseContract>;

export const laborDeleteContract = z.undefined();

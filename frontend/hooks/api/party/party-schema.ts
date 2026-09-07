import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Contracts for `PartyController` and `SubjectController` handlers.
 *
 * Party list uses offset-based pagination (`{ data, pagination: { page, limit,
 * total, totalPages, nextCursor, hasMore } }`), not cursor-only.
 * Subject list uses cursor-based pagination (`{ data, pagination }`) from
 * `cursorPageSchema`.
 *
 * NOT `.strict()`. Timestamps are ISO strings.
 */

const partyRowContract = z.object({
  partyId: z.string(),
  organizationId: z.string(),
  partyType: z.string(),
  partyKind: z.string().nullable(),
  name: z.string(),
  legalName: z.string().nullable(),
  displayName: z.string().nullable(),
  taxNumber: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  notes: z.string().nullable(),
  employerPartyId: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const partyPaginationContract = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number().optional(),
  totalPages: z.number().optional(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const partyListContract = z.object({
  data: z.array(partyRowContract),
  pagination: partyPaginationContract,
});

export const partyDetailContract = partyRowContract;

export const partyMutationContract = partyRowContract;

export const partyDeleteContract = z.object({ success: z.literal(true) });

const subjectTypeFieldContract = z.object({
  name: z.string(),
  label: z.string(),
  kind: z.string(),
  required: z.boolean().optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    tone: z.string().optional(),
  })).optional(),
  hint: z.string().optional(),
});

const subjectTypeRowContract = z.object({
  subjectTypeId: z.string(),
  organizationId: z.string(),
  key: z.string(),
  singular: z.string(),
  plural: z.string(),
  titleField: z.string(),
  fields: z.array(subjectTypeFieldContract),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const subjectTypeListContract = z.object({ data: z.array(subjectTypeRowContract) });
export const subjectTypeDetailContract = subjectTypeRowContract;
export const subjectTypeMutationContract = subjectTypeRowContract;
export const subjectTypeDeleteContract = z.object({ deleted: z.literal(true) });

const subjectItemContract = z.object({
  subjectId: z.string(),
  organizationId: z.string(),
  subjectTypeId: z.string(),
  title: z.string(),
  reference: z.string().nullable(),
  status: z.string().nullable(),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const subjectPartyLinkContract = z.object({
  subjectPartyLinkId: z.string(),
  subjectId: z.string(),
  partyId: z.string(),
  organizationId: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const subjectListContract = cursorPageContract(subjectItemContract);

export const subjectDetailContract = subjectItemContract.extend({
  parties: z.array(subjectPartyLinkContract),
});

export const subjectMutationContract = subjectItemContract;

export const subjectLinkContract = subjectPartyLinkContract;

export const subjectUnlinkContract = z.object({ unlinked: z.literal(true) });

export const partySubjectsContract = z.object({ data: z.array(subjectItemContract) });

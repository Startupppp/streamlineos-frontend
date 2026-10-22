import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";


export const partyRowContract = z.object({
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
  total: z.number(),
  totalPages: z.number(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const partyListContract = z.object({
  data: z.array(partyRowContract),
  pagination: partyPaginationContract,
});

export const partyDetailContract = partyRowContract;

export const partyMutationContract = partyRowContract;

const subjectTypeFieldContract = z.object({
  name: z.string(),
  label: z.string(),
  kind: z.enum([
    "text", "email", "phone", "url", "number",
    "money", "date", "select", "badge", "longText",
  ]),
  required: z.boolean().optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    tone: z.enum(["success", "warning", "danger", "info", "neutral"]).optional(),
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

const subjectPartyLinkRowContract = z.object({
  subjectPartyLinkId: z.string(),
  subjectId: z.string(),
  partyId: z.string(),
  organizationId: z.string(),
  relationship: z.string(),
  linkedAt: z.string(),
  linkedBy: z.string().nullable(),
});

export const subjectListContract = cursorPageContract(subjectItemContract);

export const subjectDetailContract = z.object({
  subjectId: z.string(),
  organizationId: z.string(),
  subjectTypeId: z.string(),
  typeKey: z.string(),
  typeSingular: z.string(),
  title: z.string(),
  reference: z.string().nullable(),
  status: z.string().nullable(),
  fields: z.array(subjectTypeFieldContract),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  linkedPartyId: z.string().nullable(),
  resolvedVia: z.enum(["subject-record", "link-record"]),
  parties: z.array(z.object({
    partyId: z.string(),
    name: z.string(),
    relationship: z.string(),
    subjectPartyLinkId: z.string(),
  })),
});

export const subjectMutationContract = subjectItemContract;

export const subjectLinkContract = subjectPartyLinkRowContract;

export const subjectUnlinkContract = z.object({ unlinked: z.literal(true) });

export const partySubjectsContract = z.object({
  data: z.array(z.object({
    subjectId: z.string(),
    title: z.string(),
    status: z.string().nullable(),
    subjectTypeId: z.string(),
    typeKey: z.string(),
    relationship: z.string(),
    subjectPartyLinkId: z.string(),
  })),
});

export const partyRolesContract = z.object({ roles: z.array(z.string()) });

export const partyContactContract = z.object({
  partyContactId: z.string(),
  organizationId: z.string(),
  partyId: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  title: z.string().nullable(),
  isPrimary: z.boolean(),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const partyContactListContract = z.array(partyContactContract);

export type PartyContact = z.infer<typeof partyContactContract>;

import { z } from "zod";

const crmOrgSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string().nullable(),
  size: z.string().nullable(),
  website: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  description: z.string().nullable(),
  parentId: z.number().int().nullable(),
  mergedIntoId: z.null().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const crmOrgWithOpenRequestsSchema = crmOrgSchema.extend({
  openRequestCount: z.number().int(),
});

export const crmOrgsListContract = z.object({
  organizations: z.array(crmOrgWithOpenRequestsSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  totalCount: z.number().int().optional(),
});

export const crmOrgDetailContract = crmOrgSchema.extend({
  contacts: z.array(z.unknown()).optional(),
});

const potentialDuplicateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  domain: z.string().nullable(),
  matchReason: z.enum(["domain", "name"]),
});

export const crmOrgCreatedContract = crmOrgSchema.extend({
  possibleDuplicates: z.array(potentialDuplicateSchema),
});

export const crmOrgContract = crmOrgSchema;

export const crmOrgDuplicatesContract = z.object({
  items: z.array(
    z.object({
      org1: z.object({ id: z.number().int(), name: z.string(), domain: z.string().nullable() }),
      org2: z.object({ id: z.number().int(), name: z.string(), domain: z.string().nullable() }),
      matchReason: z.enum(["domain", "name"]),
    }),
  ),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const crmOrgPotentialDuplicatesContract = z.array(potentialDuplicateSchema);

export const orgHierarchyNodeSchema: z.ZodType<{
  id: number;
  name: string;
  industry: string | null;
  healthScore: number | null;
  parentId: number | null;
  children: unknown[];
}> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    name: z.string(),
    industry: z.string().nullable(),
    healthScore: z.number().nullable(),
    parentId: z.number().int().nullable(),
    children: z.array(orgHierarchyNodeSchema),
  }),
);

export const orgRollupContract = z.object({
  totalContacts: z.number().int(),
  totalDeals: z.number().int(),
  openDeals: z.number().int(),
  totalDealValue: z.number(),
  totalLeads: z.number().int(),
});

export const orgTimelineContract = z.array(
  z.object({
    id: z.string(),
    date: z.string(),
    type: z.enum(["contact_created", "deal_created", "lead_linked", "note_added"]),
    description: z.string(),
    entityId: z.number().int(),
  }),
);

export const orgRelatedLeadsContract = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    status: z.string(),
    priority: z.string(),
    company: z.string().nullable(),
    source: z.string(),
    createdAt: z.string(),
  }),
);

export const orgMergeResultContract = z.object({
  success: z.literal(true),
  survivorId: z.number().int(),
  mergedId: z.number().int(),
  partyMergeId: z.string(),
  conflicts: z.unknown(),
});

export const deleteOrgContract = z.object({ success: z.boolean() });

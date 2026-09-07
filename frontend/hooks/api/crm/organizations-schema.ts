import { z } from "zod";

const crmOrgSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string().nullable(),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"] as const).nullable(),
  website: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  description: z.string().nullable(),
  healthScore: z.number().nullable(),
  parentId: z.number().int().nullable(),
  notes: z.string().nullable(),
  mergedIntoId: z.number().int().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
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

interface OrgHierarchyNodeShape {
  id: number;
  name: string;
  industry: string | null;
  healthScore: number | null;
  parentId: number | null;
  children: OrgHierarchyNodeShape[];
}

export const orgHierarchyNodeSchema: z.ZodType<OrgHierarchyNodeShape> = z.lazy(() =>
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
  conflicts: z.record(z.string(), z.object({ kept: z.unknown(), discarded: z.unknown() })),
});

export const crmPeopleSlugsContract = z.record(z.string(), z.string());

export const deleteOrgContract = z.object({ success: z.boolean() });

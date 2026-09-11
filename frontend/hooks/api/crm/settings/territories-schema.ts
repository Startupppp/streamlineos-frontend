import { z } from "zod";

const territoryCriteriaSchema = z.object({
  countries: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  postalCodes: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  companySizes: z.array(z.string()).optional(),
  productKeys: z.array(z.string()).optional(),
  accountTypes: z.array(z.string()).optional(),
});

const territoryRepSchema = z.object({
  id: z.number().int(),
  crmPersonId: z.number().int(),
  assignedAt: z.string(),
});

const territoryLocationSchema = z.object({
  id: z.number().int(),
  kind: z.string(),
  value: z.string(),
});

const territorySchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  criteria: territoryCriteriaSchema,
  priority: z.number().int(),
  states: z.array(z.string()),
  cities: z.array(z.string()),
  assignedReps: z.array(z.number().int()),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  reps: z.array(territoryRepSchema),
  locations: z.array(territoryLocationSchema),
});

export const territoriesListContract = z.array(territorySchema);
export const territoryContract = territorySchema;

export const territoryPreviewContract = z.object({
  matchedTerritory: territorySchema.nullable(),
  assignedReps: z.array(z.number().int()),
  assignedRepNames: z.array(z.string()),
});

export const deleteTerritoryContract = z.object({ success: z.boolean() });

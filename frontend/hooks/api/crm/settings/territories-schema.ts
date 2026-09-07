import { z } from "zod";

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
  criteria: z.unknown(),
  priority: z.number().int(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  reps: z.array(territoryRepSchema),
  locations: z.array(territoryLocationSchema),
});

export const territoriesListContract = z.array(territorySchema);
export const territoryContract = territorySchema;

export const territoryPreviewContract = z.object({
  matchedTerritory: z.unknown().nullable(),
  assignedReps: z.array(z.number().int()),
  assignedRepNames: z.array(z.string()),
});

export const deleteTerritoryContract = z.object({ success: z.boolean() });

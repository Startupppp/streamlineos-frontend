import { z } from "zod";
import {
  genVelocityReportSchema,
  genBurnupReportSchema,
  genCfdReportSchema,
  genCriticalPathSchema,
  genCycleTimeSchema,
  genLeadTimeSchema,
} from "@/contracts/build-contracts.generated";

export const velocityContract = genVelocityReportSchema;
export const burnupDataContract = genBurnupReportSchema;
export const cfdDataContract = genCfdReportSchema;
export const criticalPathContract = genCriticalPathSchema;
export const cycleTimeContract = genCycleTimeSchema;
export const leadTimeContract = genLeadTimeSchema;

export const snapshotResultContract = z.object({
  captured: z.number().int(),
});

const customerListItemContract = z.object({
  id: z.number().int(),
  orgId: z.string().optional().default(""),
  name: z.string(),
  domain: z.string().nullable(),
  industry: z.string().nullable(),
  size: z.string().nullable(),
  website: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  description: z.string().nullable(),
  healthScore: z.number().nullable().optional(),
  parentId: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  openRequestCount: z.number().int().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const customerPageContract = z.object({
  data: z.array(customerListItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

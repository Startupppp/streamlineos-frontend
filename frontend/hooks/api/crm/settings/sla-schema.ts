import { z } from "zod";

const slaPolicySchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  appliesTo: z.string(),
  priority: z.string(),
  firstResponseHours: z.number().int(),
  resolutionHours: z.number().int(),
  conditions: z.unknown(),
  targetMinutes: z.number().int().nullable(),
  businessHours: z.boolean(),
  appliesToText: z.string().nullable(),
  priorityText: z.string().nullable(),
  createdAt: z.string(),
});

export const slaPoliciesListContract = z.array(slaPolicySchema);
export const slaPolicyContract = slaPolicySchema;

export const slaBreachedListContract = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string().nullable(),
    status: z.string(),
    priority: z.string(),
    slaDeadline: z.string().nullable(),
    createdAt: z.string(),
  }),
);

export const slaReportContract = z.object({
  total: z.number().int(),
  compliant: z.number().int(),
  breached: z.number().int(),
  complianceRate: z.number().int(),
});

export const deleteSlaContract = z.object({ success: z.boolean() });

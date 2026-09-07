import { z } from "zod";

const serviceDeliveryItemContract = z.object({
  kind: z.enum(["case", "safety_incident", "helpdesk"]),
  id: z.number().int(),
  ref: z.string(),
  title: z.string(),
  status: z.string(),
  severity: z.string().nullable(),
  assignedTo: z.string().nullable(),
  href: z.string(),
  createdAt: z.string(),
  aging: z.object({
    ageHours: z.number(),
    ageDays: z.number(),
    bucket: z.enum(["fresh", "watch", "overdue", "critical"]),
    slaBreached: z.boolean(),
  }),
  severityRank: z.number().int(),
  confidential: z.boolean().optional(),
});

export const opsInboxContract = z.object({
  mode: z.literal("ops_unified_inbox"),
  honestyNote: z.string(),
  asOf: z.string(),
  capabilities: z.object({
    canViewCases: z.boolean(),
    canViewSafety: z.boolean(),
    canViewHelpdesk: z.boolean(),
  }),
  totals: z.object({
    cases: z.number().int(),
    safety: z.number().int(),
    helpdesk: z.number().int(),
    criticalAging: z.number().int(),
    slaBreached: z.number().int(),
  }),
  items: z.array(serviceDeliveryItemContract),
});

export const myItemsContract = z.object({
  mode: z.literal("employee_self_service"),
  honestyNote: z.string(),
  items: z.array(serviceDeliveryItemContract),
  totals: z.object({ open: z.number().int() }),
});

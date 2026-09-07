import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const timesheetAuditEventContract = z.object({
  id: z.number(),
  actorMembershipId: z.number().nullable(),
  actorName: z.string().nullable(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export const auditListResponseContract = cursorPageContract(timesheetAuditEventContract);

export const auditVerifyResponseContract = z.union([
  z.object({
    valid: z.literal(true),
    checked: z.number(),
    verified: z.number(),
    legacyRows: z.number(),
  }),
  z.object({
    valid: z.literal(false),
    brokenAtId: z.number(),
    checked: z.number(),
    legacyRows: z.number(),
  }),
]);

import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const exceptionItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  periodId: z.number().nullable(),
  entryId: z.number().nullable(),
  rule: z.enum(["MISSING_TIMESHEET", "UNDER_HOURS", "OVER_MAX_DAILY", "UNRESOLVED_TIMER", "MISSING_RATE"]),
  severity: z.enum(["ERROR", "WARNING"]),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  message: z.string(),
  details: z.unknown().nullable(),
  ownerMembershipId: z.number().nullable(),
  dueDate: z.string().nullable(),
  resolutionReason: z.string().nullable(),
  resolvedByMembershipId: z.number().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    membershipId: z.number().nullable(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
});

export const exceptionsListResponseContract = cursorPageContract(exceptionItemContract);

export const exceptionsSummaryResponseContract = z.object({
  total: z.number(),
  byStatus: z.record(z.string(), z.number()),
  bySeverity: z.record(z.string(), z.number()),
  openBySeverity: z.record(z.string(), z.number()),
});

export const exceptionResolutionResponseContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  periodId: z.number().nullable(),
  entryId: z.number().nullable(),
  rule: z.enum(["MISSING_TIMESHEET", "UNDER_HOURS", "OVER_MAX_DAILY", "UNRESOLVED_TIMER", "MISSING_RATE"]),
  severity: z.enum(["ERROR", "WARNING"]),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  message: z.string(),
  details: z.unknown().nullable(),
  ownerMembershipId: z.number().nullable(),
  dueDate: z.string().nullable(),
  resolutionReason: z.string().nullable(),
  resolvedByMembershipId: z.number().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const detectorResponseContract = z.object({
  week: z.object({ start: z.string(), end: z.string() }),
  candidates: z.number(),
  created: z.number(),
});

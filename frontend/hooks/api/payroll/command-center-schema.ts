import { z } from "zod";

const exceptionCountsContract = z.object({
  BLOCKER: z.number(),
  WARNING: z.number(),
  INFO: z.number(),
});

const commandCenterHeaderContract = z.object({
  runId: z.number().nullable(),
  month: z.string(),
  status: z.string().nullable(),
  grossTotal: z.string(),
  deductionTotal: z.string(),
  netTotal: z.string(),
  employerCostTotal: z.string(),
  employeeCount: z.number(),
  exceptionCounts: exceptionCountsContract,
});

const commandCenterChecklistItemContract = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
  href: z.string().nullable(),
  detail: z.string().nullable(),
});

const topExceptionContract = z.object({
  id: z.number(),
  runEmployeeId: z.number(),
  userId: z.string().nullable(),
  code: z.string(),
  severity: z.enum(["BLOCKER", "WARNING", "INFO"]),
  message: z.string(),
  status: z.string(),
});

const varianceSummaryContract = z.object({
  previousMonth: z.string().nullable(),
  currentNet: z.string(),
  previousNet: z.string(),
  netDelta: z.string(),
  netDeltaPercent: z.number(),
  newJoiners: z.number(),
  exited: z.number(),
  changedEmployees: z.number(),
});

const pendingApprovalContract = z.object({
  id: z.number(),
  stage: z.number(),
  status: z.string(),
});

const packComplianceChecklistItemContract = z.object({
  key: z.string(),
  label: z.string(),
  detail: z.string(),
});

const commandCenterPanelsContract = z.object({
  runStatus: z.string().nullable(),
  topExceptions: z.array(topExceptionContract),
  varianceSummary: varianceSummaryContract.nullable(),
  pendingApprovals: z.array(pendingApprovalContract),
  payoutReadiness: z.boolean(),
  statutoryReadiness: z.object({
    taxDeclarationsLocked: z.boolean(),
    packComplianceChecklist: z.array(packComplianceChecklistItemContract),
  }),
});

const upcomingCalendarEventContract = z.object({
  id: z.number(),
  orgId: z.string(),
  policyId: z.number().nullable(),
  month: z.string().nullable(),
  type: z.string(),
  date: z.string(),
  title: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const commandCenterResponseContract = z.object({
  header: commandCenterHeaderContract,
  checklist: z.array(commandCenterChecklistItemContract),
  panels: commandCenterPanelsContract,
  upcomingCalendarEvents: z.array(upcomingCalendarEventContract),
});

export type CommandCenterData = z.infer<typeof commandCenterResponseContract>;

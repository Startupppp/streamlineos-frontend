import { z } from "zod";

export const readinessStageKeyContract = z.enum([
  "timesheets_approved",
  "timesheets_exported",
  "handoff_received",
  "handoff_acknowledged",
  "inputs_locked",
  "run_generated",
]);

export const readinessStageStatusContract = z.enum(["done", "pending", "blocked", "not_applicable"]);

const readinessOwnerContract = z.object({ label: z.string(), permission: z.string() });
const readinessActionContract = z.object({ label: z.string(), href: z.string() });

export const readinessStageContract = z.object({
  key: readinessStageKeyContract,
  label: z.string(),
  status: readinessStageStatusContract,
  owner: readinessOwnerContract,
  at: z.string().nullable(),
  detail: z.string(),
  action: readinessActionContract.nullable(),
});

export const readinessExceptionContract = z.object({
  code: z.enum(["TIMESHEETS_AWAITING_APPROVAL", "APPROVED_HOURS_NOT_EXPORTED", "PERIOD_CHANGED_AFTER_EXPORT", "EXPORT_REJECTED"]),
  severity: z.enum(["blocker", "warning"]),
  message: z.string(),
  owner: readinessOwnerContract,
  action: readinessActionContract.nullable(),
  period: z
    .object({
      periodId: z.number(),
      userId: z.string().nullable(),
      userName: z.string().nullable(),
      userEmail: z.string().nullable(),
      periodStart: z.string(),
      periodEnd: z.string(),
      status: z.string(),
      exportId: z.number(),
      exportedEntryCount: z.number(),
      exportedHours: z.string(),
      changedAt: z.string(),
    })
    .nullable(),
});

export const payrollReadinessContract = z.object({
  month: z.string(),
  window: z.object({ start: z.string(), end: z.string() }),
  cutoff: z.object({ type: z.string(), date: z.string(), title: z.string() }).nullable(),
  timesheets: z.object({
    unsubmitted: z.number(),
    awaitingApproval: z.number(),
    approved: z.number(),
    locked: z.number(),
    rejected: z.number(),
    approvedHoursNotExported: z.string(),
    approvedEntriesNotExported: z.number(),
  }),
  inputs: z.object({ status: z.string().nullable(), lockedAt: z.string().nullable() }),
  run: z.object({ id: z.number(), status: z.string(), createdAt: z.string() }).nullable(),
  stages: z.array(readinessStageContract),
  exports: z.array(
    z.object({
      id: z.number(),
      exportedAt: z.string(),
      dateRangeStart: z.string(),
      dateRangeEnd: z.string(),
      entryCount: z.number(),
      totalHours: z.string(),
      workerCount: z.number(),
      receivedAt: z.string().nullable(),
      ackStatus: z.string().nullable(),
      ackAt: z.string().nullable(),
      ackNote: z.string().nullable(),
    }),
  ),
  exceptions: z.array(readinessExceptionContract),
});

export type PayrollReadiness = z.infer<typeof payrollReadinessContract>;
export type ReadinessStage = z.infer<typeof readinessStageContract>;
export type ReadinessException = z.infer<typeof readinessExceptionContract>;

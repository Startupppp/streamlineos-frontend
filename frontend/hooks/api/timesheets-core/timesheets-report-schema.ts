import { z } from "zod";

export const reportsOverviewResponseContract = z.object({
  totalHours: z.number(),
  billableHours: z.number(),
  nonBillableHours: z.number(),
  billableRatio: z.number(),
  approvedHours: z.number(),
  pendingApprovalHours: z.number(),
  pendingPeriods: z.number(),
  activeUsers: z.number(),
  byDay: z.array(z.object({ date: z.string(), hours: z.number() })),
  byProject: z.array(
    z.object({
      projectId: z.number(),
      projectName: z.string(),
      hours: z.number(),
    }),
  ),
});

export const reportsUtilizationResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  summary: z.object({
    totalHours: z.number(),
    billableHours: z.number(),
    nonBillableHours: z.number(),
    billableUtilization: z.number(),
    activeUsers: z.number(),
  }),
  users: z.array(
    z.object({
      userId: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      totalHours: z.number(),
      billableHours: z.number(),
      nonBillableHours: z.number(),
      billableUtilization: z.number(),
    }),
  ),
});

export const clientProfitabilityResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  clients: z.array(
    z.object({
      clientId: z.number().nullable(),
      clientName: z.string(),
      hours: z.number(),
      missingRateHours: z.number(),
      amounts: z.array(z.object({ currency: z.string(), billableAmount: z.number(), costAmount: z.number().nullable(), margin: z.number().nullable() })),
    }),
  ),
});

export const complianceResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  expectedWeeklyHours: z.number().nullable(),
  users: z.array(
    z.object({
      userId: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      expectedHours: z.number().nullable(),
      actualHours: z.number(),
      missingDays: z.number(),
      periodsSubmitted: z.number(),
      periodsApproved: z.number(),
      periodsOverdue: z.number(),
    }),
  ),
});

export const approvalSlaResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  totalSubmitted: z.number(),
  byStatus: z.record(z.string(), z.number()),
  avgHoursToDecision: z.number().nullable(),
  oldestPending: z
    .object({
      periodId: z.number(),
      userId: z.string(),
      submittedAt: z.string(),
      daysWaiting: z.number(),
    })
    .nullable(),
  perApprover: z.array(
    z.object({
      approverId: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      pendingCount: z.number(),
      avgHoursToDecision: z.number().nullable(),
    }),
  ),
});

export const billingLeakageResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  billableHours: z.number(),
  nonBillableHours: z.number(),
  writeOffRate: z.number(),
  approvedBillableUninvoiced: z.object({
    hours: z.number(),
    amounts: z.array(z.object({ currency: z.string(), amount: z.number() })),
  }),
  missingRateHours: z.number(),
  voidedHours: z.number(),
});

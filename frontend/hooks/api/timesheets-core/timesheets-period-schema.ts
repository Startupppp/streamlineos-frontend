import { z } from "zod";
import { approvalCandidateContract } from "@/hooks/api/hr/approval-route-schema";
import { DB_ENUMS } from "@/contracts/db-enums.generated";

export const timesheetApprovalRouteContract = z.object({
  source: z.enum(["reporting_manager", "project_manager", "auto"]),
  rung: z.string().nullable(),
  approverUserId: z.string().nullable(),
  approverMembershipId: z.number().nullable(),
  assignedToUserId: z.string().nullable(),
  delegation: z.object({ fromUserId: z.string(), toUserId: z.string(), endsAt: z.string() }).nullable(),
  projectId: z.number().nullable(),
  explanation: z.string(),
  slaHours: z.number(),
  escalationRung: z.string().nullable(),
  escalatedFrom: z.object({ approverUserId: z.string().nullable(), rung: z.string().nullable(), at: z.string() }).nullable(),
});

export type TimesheetApprovalRoute = z.infer<typeof timesheetApprovalRouteContract>;

export const periodApproverPreviewContract = z.object({
  kind: z.enum(["auto", "routed", "unowned"]),
  approver: approvalCandidateContract.nullable(),
  route: timesheetApprovalRouteContract.nullable(),
  dueAt: z.string().nullable(),
  explanation: z.string(),
});

export type PeriodApproverPreview = z.infer<typeof periodApproverPreviewContract>;

export const timesheetPeriodContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: z.enum(DB_ENUMS.timesheet_period_status),
  totalHours: z.string(),
  billableHours: z.string(),
  nonBillableHours: z.string(),
  submittedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  lockedAt: z.string().nullable(),
  currentApproverMembershipId: z.number().nullable(),
  approvalRoute: timesheetApprovalRouteContract.nullable(),
  approvalDueAt: z.string().nullable(),
  approvalEscalatedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z
    .object({
      membershipId: z.number().nullable(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .optional(),
});

export const periodsListResponseContract = z.array(timesheetPeriodContract);

export const periodDetailResponseContract = z.object({
  period: timesheetPeriodContract,
  entries: z.array(
    z.object({
      id: z.number(),
      orgId: z.string(),
      userMembershipId: z.number().nullable(),
      ticketId: z.number().nullable(),
      projectId: z.number().nullable(),
      date: z.string(),
      hours: z.string(),
      description: z.string().nullable(),
      isBillable: z.boolean(),
      billingType: z.enum(["BILLABLE", "NON_BILLABLE", "FIXED"]),
      status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      submittedAt: z.string().nullable(),
      approvedAt: z.string().nullable(),
      approvedByMembershipId: z.number().nullable(),
      rejectionReason: z.string().nullable(),
      voidedAt: z.string().nullable(),
      invoicingStatus: z.enum(["UNINVOICED", "INVOICE_DRAFTED", "INVOICED"]),
      billRate: z.string().nullable(),
      currency: z.string().nullable(),
      timesheetPeriodId: z.number().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      project: z.object({ id: z.number(), name: z.string() }).nullable(),
    }),
  ),
});

export type TimesheetPeriod = z.infer<typeof timesheetPeriodContract>;

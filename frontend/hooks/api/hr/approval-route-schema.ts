import { z } from "zod";

export const approvalRequestKindContract = z.enum([
  "leave",
  "wfh",
  "attendance_correction",
  "overtime",
  "comp_off",
  "expense",
  "travel",
  "timesheet",
  "compensation",
  "exit",
  "hr_case",
]);

export type ApprovalRequestKind = z.infer<typeof approvalRequestKindContract>;

export const approvalRungContract = z.enum(["reporting_manager", "managers_manager", "department_head", "queue"]);

export type ApprovalRung = z.infer<typeof approvalRungContract>;

const approvalRungSkipReasonContract = z.enum([
  "no-manager",
  "no-department-head",
  "self",
  "lacks-permission",
  "queue-empty",
  "self-reference",
  "manager-not-in-organization",
  "manager-inactive",
  "manager-has-no-employment",
  "manager-exited",
  "circular",
]);

export const approvalCandidateContract = z.object({
  userId: z.string(),
  membershipId: z.number().int(),
  name: z.string().nullable(),
  email: z.string(),
  designation: z.string().nullable(),
});

export type ApprovalCandidate = z.infer<typeof approvalCandidateContract>;

const approvalQueueContract = z.object({
  permission: z.string(),
  label: z.string(),
  memberCount: z.number().int(),
  members: z.array(approvalCandidateContract),
});

export const approvalRouteContract = z.object({
  kind: approvalRequestKindContract,
  subjectUserId: z.string(),
  permission: z.string(),
  resolvedAt: z.string(),
  rung: approvalRungContract.nullable(),
  assignedTo: approvalCandidateContract.nullable(),
  approver: approvalCandidateContract.nullable(),
  delegation: z
    .object({
      source: z.enum(["workflow", "permission"]),
      delegationId: z.string(),
      fromUserId: z.string(),
      toUserId: z.string(),
      endsAt: z.string(),
      reason: z.string().nullable(),
    })
    .nullable(),
  queue: approvalQueueContract.nullable(),
  skipped: z.array(z.object({ rung: approvalRungContract, userId: z.string().nullable(), reason: approvalRungSkipReasonContract })),
  slaHours: z.number().int(),
  dueAt: z.string(),
  escalation: z
    .object({ rung: approvalRungContract, approver: approvalCandidateContract.nullable(), queue: approvalQueueContract.nullable() })
    .nullable(),
  explanation: z.string(),
});

export type ApprovalRoute = z.infer<typeof approvalRouteContract>;

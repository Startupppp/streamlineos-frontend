import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";

export const EXIT_CHECKLIST_KINDS = [
  "manager_handover",
  "hr_clearance",
  "it_access_removal",
  "asset_return",
  "final_settlement",
  "documents",
  "exit_interview",
  "completion_evidence",
  "custom",
] as const;

export type ExitChecklistKind = (typeof EXIT_CHECKLIST_KINDS)[number];

export const EXIT_CHECKLIST_STATUSES = ["PENDING", "DONE", "WAIVED"] as const;

export type ExitChecklistStatus = (typeof EXIT_CHECKLIST_STATUSES)[number];

export const EXIT_CHECKLIST_QUEUES = [
  "hr:exit:manage",
  "hr:identity:manage",
  "hr:assets:manage",
  "hr:payroll:approve",
] as const;

export type ExitChecklistQueue = (typeof EXIT_CHECKLIST_QUEUES)[number];

const resignationUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    designation: z.string().nullable(),
    joiningDate: z.string().nullable(),
  })
  .nullable();

const resignationReviewerContract = z.object({ id: z.string(), name: z.string().nullable() }).nullable();

export const resignationContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  reason: z.string().nullable(),
  reasonCategory: z.string().nullable(),
  lastWorkingDate: z.string().nullable(),
  noticePeriodDays: z.number().int(),
  status: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  hrReviewedBy: z.string().nullable(),
  hrReviewedAt: z.string().nullable(),
  hrRemarks: z.string().nullable(),
  finalReviewedBy: z.string().nullable(),
  finalReviewedAt: z.string().nullable(),
  finalRemarks: z.string().nullable(),
  willingForExitInterview: z.boolean(),
  companyFeedback: z.string().nullable(),
  exitInterviewNotes: z.string().nullable(),
  exitInterviewDate: z.string().nullable(),
  exitInterviewConductedBy: z.string().nullable(),
  feedback: z.array(z.object({ question: z.string(), answer: z.string() })).nullable(),
  userMembershipId: z.number().int().nullable(),
  rowVersion: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  hasResignationLetter: z.boolean(),
  user: resignationUserContract,
  hrReviewer: resignationReviewerContract,
});

export const resignationListContract = z.object({
  data: z.array(resignationContract),
  pagination: cursorPaginationContract,
});

export const exitChecklistOwnerContract = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("member"),
    membershipId: z.number().int(),
    userId: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  z.object({
    type: z.literal("queue"),
    permission: z.enum(EXIT_CHECKLIST_QUEUES),
    label: z.string(),
  }),
]);

export const exitChecklistItemContract = z.object({
  id: z.number().int(),
  itemKey: z.string(),
  kind: z.enum(EXIT_CHECKLIST_KINDS),
  title: z.string(),
  status: z.enum(EXIT_CHECKLIST_STATUSES),
  dueDate: z.string().nullable(),
  owner: exitChecklistOwnerContract,
  completedAt: z.string().nullable(),
  completedBy: z.object({ membershipId: z.number().int(), name: z.string().nullable() }).nullable(),
  evidence: z.string().nullable(),
  notes: z.string().nullable(),
  updatedAt: z.string(),
  viewerCanUpdate: z.boolean(),
});

export const exitChecklistContract = z.object({
  items: z.array(exitChecklistItemContract),
  summary: z.object({
    total: z.number().int(),
    open: z.number().int(),
    done: z.number().int(),
    waived: z.number().int(),
    overdue: z.number().int(),
  }),
});

const resignationTimelineStepContract = z.object({
  label: z.string(),
  status: z.enum(["completed", "active", "pending", "rejected"]),
  actor: z.string().nullable(),
  timestamp: z.string().nullable(),
  remarks: z.string().nullable(),
});

export const resignationDetailContract = resignationContract.extend({
  finalReviewer: resignationReviewerContract,
  progress: z.array(resignationTimelineStepContract),
  checklist: exitChecklistContract,
});

const resignationProgressStepContract = z.object({
  label: z.string(),
  status: z.enum(["completed", "active", "pending", "rejected"]),
  actor: z.string().optional(),
  timestamp: z.string().optional(),
  remarks: z.string().optional(),
});

export const resignationProgressContract = z.object({
  id: z.number().int(),
  status: z.string(),
  isRejected: z.boolean(),
  isWithdrawn: z.boolean(),
  steps: z.array(resignationProgressStepContract),
  lastWorkingDate: z.string().nullable(),
  reasonCategory: z.string().nullable(),
});

export const exitChecklistItemUpdateContract = z
  .object({
    status: z.enum(EXIT_CHECKLIST_STATUSES).optional(),
    evidence: z.string().trim().min(1).max(2000).optional(),
    notes: z.string().trim().max(2000).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ownerUserId: z.string().trim().min(1).optional(),
    ownerQueue: z.enum(EXIT_CHECKLIST_QUEUES).optional(),
  })
  .strict();

export type ExitChecklistItemUpdateInput = z.infer<typeof exitChecklistItemUpdateContract>;

export const successContract = z.object({ success: z.boolean() });

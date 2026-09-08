import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";

const resignationUserContract = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
});

const exitChecklistItemContract = z.object({
  id: z.number().int(),
  title: z.string(),
  resignationId: z.number().int(),
  status: z.string(),
  assignedTo: z.string().nullable(),
  completedAt: z.string().nullable(),
  dueDate: z.string().nullable(),
});

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
  resignationLetterUrl: z.string().nullable(),
  hrReviewer: z.object({ id: z.string(), name: z.string().nullable() }).nullable(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
});

export const resignationListContract = z.object({
  data: z.array(resignationContract),
  pagination: cursorPaginationContract,
});

const resignationProgressStepContract = z.object({
  step: z.string(),
  label: z.string(),
  status: z.string(),
  timestamp: z.string().optional(),
});

export const resignationProgressContract = z.object({
  label: z.string(),
  status: z.string(),
  actor: z.string().nullable(),
  timestamp: z.string().nullable(),
  remarks: z.string().nullable(),
  steps: z.array(resignationProgressStepContract),
});

export const successContract = z.object({ success: z.boolean() });

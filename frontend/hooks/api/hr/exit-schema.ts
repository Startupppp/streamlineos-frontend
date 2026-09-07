import { z } from "zod";

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
  userMembershipId: z.number().int().nullable(),
  resignationDate: z.string(),
  lastWorkingDay: z.string().nullable(),
  reason: z.string().nullable(),
  status: z.string(),
  hrReviewStatus: z.string().nullable(),
  finalReviewStatus: z.string().nullable(),
  hrReviewedBy: z.string().nullable(),
  hrReviewedAt: z.string().nullable(),
  finalReviewedBy: z.string().nullable(),
  finalReviewedAt: z.string().nullable(),
  exitInterviewStatus: z.string().nullable(),
  willingForExitInterview: z.boolean(),
  noticePeriodDays: z.number().int().nullable(),
  exitInterviewNotes: z.string().nullable(),
  exitInterviewDate: z.string().nullable(),
  exitInterviewConductedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  hasResignationLetter: z.boolean(),
  user: resignationUserContract,
  checklists: z.array(exitChecklistItemContract),
});

export const resignationListContract = z.object({
  data: z.array(resignationContract),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

const resignationProgressStepContract = z.object({
  key: z.string(),
  label: z.string(),
  status: z.string(),
  completedAt: z.string().nullable(),
});

export const resignationProgressContract = z.object({
  resignationId: z.number().int(),
  status: z.string(),
  currentStep: z.string().nullable(),
  steps: z.array(resignationProgressStepContract),
});

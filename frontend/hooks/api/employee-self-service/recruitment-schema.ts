import { z } from "zod";

const assignedInterviewItemContract = z.object({
  id: z.number(),
  type: z.string(),
  scheduledAt: z.string(),
  duration: z.number(),
  location: z.string().nullable(),
  meetingLink: z.string().nullable(),
  result: z.enum(["PENDING", "PASSED", "FAILED", "NO_SHOW"]),
  candidateFirstName: z.string(),
  candidateLastName: z.string(),
  jobTitle: z.string().nullable(),
  scorecardSubmittedAt: z.string().nullable(),
});

export const assignedInterviewsResponseContract = z.object({
  items: z.array(assignedInterviewItemContract),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const interviewScorecardResponseContract = z.object({
  id: z.number(),
  orgId: z.string().nullable(),
  interviewId: z.number(),
  interviewerId: z.string(),
  interviewerMembershipId: z.number().nullable(),
  templateId: z.number().nullable(),
  ratings: z.record(z.string(), z.number()),
  recommendation: z.string(),
  notes: z.string().nullable(),
  isBlindMode: z.boolean(),
  submittedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

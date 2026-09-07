import { z } from "zod";

export const assignedInterviewContract = z.object({
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
  items: z.array(assignedInterviewContract),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type AssignedInterview = z.infer<typeof assignedInterviewContract>;

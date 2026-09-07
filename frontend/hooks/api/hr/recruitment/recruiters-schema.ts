import { z } from "zod";

const recruiterSummarySchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  assignedJobsCount: z.number().int(),
  activitySummary: z.record(z.string(), z.number().int()),
});

const recruiterActivityEntrySchema = z.object({
  id: z.number().int(),
  recruiterId: z.string(),
  action: z.string(),
  candidateId: z.number().int().nullable(),
  jobPostingId: z.number().int().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  recruiterName: z.string().nullable(),
  candidateFirstName: z.string().nullable(),
  candidateLastName: z.string().nullable(),
  jobTitle: z.string().nullable(),
});

export const recruitersListContract = z.array(recruiterSummarySchema);

export const recruiterActivityListContract = z.array(recruiterActivityEntrySchema);

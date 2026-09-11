import { z } from "zod";

export const internalJobSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  departmentId: z.string().nullable(),
  location: z.string().nullable(),
  type: z.string(),
  experience: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.string().nullable(),
  openings: z.number().int(),
  applicationDeadline: z.string().nullable(),
  createdAt: z.string(),
  department: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export const internalJobListSchema = z.array(internalJobSchema);

export const internalJobApplicationSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int(),
  appliedAt: z.string(),
  coverLetter: z.string().nullable(),
  notes: z.string().nullable(),
  screeningAnswers: z.record(z.string(), z.string()).nullable(),
  status: z.string().optional(),
  updatedAt: z.string(),
});

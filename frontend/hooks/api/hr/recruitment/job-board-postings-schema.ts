import { z } from "zod";

const jobBoardPostingRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  jobPostingId: z.number().int(),
  platform: z.string(),
  externalPostUrl: z.string().nullable(),
  externalPostingId: z.string().nullable(),
  status: z.enum(["DRAFT", "POSTED", "EXPIRED", "CLOSED", "BLOCKED", "QUEUED", "FAILED", "LIVE"]),
  statusDetail: z.string().nullable(),
  lastAttemptAt: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  postedAt: z.string().nullable(),
  expiryDate: z.string().nullable(),
  spend: z.string().nullable(),
  applicantCount: z.number().int(),
  qualifiedCount: z.number().int(),
  hiredCount: z.number().int(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobBoardPostingsListContract = z.array(jobBoardPostingRowSchema);

export const createJobBoardPostingContract = jobBoardPostingRowSchema;

export const updateJobBoardPostingContract = jobBoardPostingRowSchema;


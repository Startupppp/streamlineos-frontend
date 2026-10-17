import { z } from "zod";

const jobBoardPostingRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  jobPostingId: z.number().int(),
  platform: z.string(),
  externalPostUrl: z.string().nullable(),
  /** The id the board returned. Null means no board ever confirmed a posting. */
  externalPostingId: z.string().nullable(),
  /**
   * `DRAFT`/`POSTED`/`EXPIRED` are the hand-recorded values a recruiter can
   * still set on a row they are tracking manually. The four that the
   * distribution pipeline writes are `BLOCKED`, `QUEUED`, `FAILED` and `LIVE` —
   * and `LIVE` has exactly one producer on the backend, which requires an id
   * the vendor sent back.
   */
  status: z.enum(["DRAFT", "POSTED", "EXPIRED", "CLOSED", "BLOCKED", "QUEUED", "FAILED", "LIVE"]),
  /** Why the row is in that status — a blocked code, or the vendor's refusal. */
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


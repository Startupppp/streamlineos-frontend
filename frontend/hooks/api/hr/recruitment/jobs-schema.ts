import { z } from "zod";

/**
 * The stored jsonb, not the backend's `@ResponseSchema`, which names only four
 * of the seven keys `screeningQuestionSchema` (`dto/jobs.schemas.ts`) writes.
 * A `z.object` STRIPS what it does not list, so omitting `id` here would erase
 * the key the edit form maps its question rows by.
 */
const screeningQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["TEXT", "YES_NO", "SINGLE_SELECT", "NUMBER"]),
  required: z.boolean(),
  knockout: z.boolean(),
  knockoutAnswer: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const jobPostingRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  orgDepartmentId: z.string().nullable(),
  hiringFlowId: z.number().int().nullable(),
  location: z.string().nullable(),
  type: z.string(),
  experience: z.string().nullable(),
  salaryMin: z.string().nullable(),
  salaryMax: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.string().nullable(),
  benefits: z.string().nullable(),
  openings: z.number().int(),
  applicationDeadline: z.string().nullable(),
  closingDate: z.string().nullable(),
  postedBy: z.string().nullable(),
  postedByMembershipId: z.number().int().nullable(),
  externalPostingIds: z.record(z.string(), z.string()).nullable(),
  isInternal: z.boolean(),
  screeningQuestions: z.array(screeningQuestionSchema).nullable(),
  status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobPostingsPageContract = z.object({
  items: z.array(jobPostingRowContract),
  total: z.number().int(),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const jobPostingDetailContract = jobPostingRowContract;

export const createJobPostingContract = jobPostingRowContract;

export const updateJobPostingContract = z.object({ success: z.literal(true) });

/**
 * One outcome per board. There is no `PUBLISHED` member, because no adapter
 * exists that could produce one — the API answers `BLOCKED` with a code the UI
 * turns into the specific thing the recruiter has to do next.
 */
export const jobBoardOutcomeContract = z.discriminatedUnion("status", [
  z.object({
    platform: z.string(),
    status: z.literal("BLOCKED"),
    code: z.enum(["no-integration", "inactive", "needs-keys", "not-implemented"]),
    message: z.string(),
  }),
  z.object({
    platform: z.string(),
    status: z.literal("QUEUED"),
    postingId: z.number().int(),
  }),
  z.object({
    platform: z.string(),
    status: z.literal("FAILED"),
    message: z.string(),
    httpStatus: z.number().int().nullable(),
  }),
]);

export const publishJobContract = z.object({
  results: z.array(jobBoardOutcomeContract),
  queuedCount: z.number().int(),
  blockedCount: z.number().int(),
  failedCount: z.number().int(),
});

export const duplicateJobPostingContract = jobPostingRowContract;

const sourcePortalRowSchema = z.object({
  id: z.number().int(),
  platform: z.string(),
  isActive: z.boolean(),
  lastSyncedAt: z.string().nullable(),
  lastSyncCount: z.number().int().nullable(),
  createdAt: z.string().nullable(),
});

export const sourcePortalsListContract = z.array(sourcePortalRowSchema);

export const upsertSourcePortalContract = sourcePortalRowSchema;

export const jobShareLinksContract = z.object({
  jobId: z.number().int(),
  title: z.string(),
  directLink: z.string(),
  shareLinks: z.array(z.object({
    platform: z.string(),
    name: z.string(),
    url: z.string(),
    utmUrl: z.string(),
  })),
});

export const recruitmentStatsContract = z.object({
  totalJobs: z.number().int(),
  openJobs: z.number().int(),
  totalCandidates: z.number().int(),
  newCandidates: z.number().int(),
  upcomingInterviews: z.number().int(),
  hiredThisMonth: z.number().int(),
  funnel: z.record(z.string(), z.number().int()),
  sources: z.array(z.object({ source: z.string(), count: z.number().int() })),
  avgTimeToHireDays: z.number().int(),
});

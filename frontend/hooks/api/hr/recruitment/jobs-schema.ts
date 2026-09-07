import { z } from "zod";

const screeningQuestionSchema = z.object({
  question: z.string(),
  type: z.string(),
  required: z.boolean(),
  knockout: z.boolean(),
});

const jobPostingRowSchema = z.object({
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
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobPostingsPageContract = z.object({
  items: z.array(jobPostingRowSchema),
  total: z.number().int(),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const jobPostingDetailContract = jobPostingRowSchema;

export const createJobPostingContract = jobPostingRowSchema;

export const updateJobPostingContract = z.object({ success: z.literal(true) });

export const deleteJobPostingContract = z.object({ success: z.literal(true) });

export const publishJobContract = z.object({
  results: z.array(z.object({
    platform: z.string(),
    status: z.string(),
  })),
  publishedCount: z.number().int(),
  externalIds: z.record(z.string(), z.string()),
});

export const duplicateJobPostingContract = jobPostingRowSchema;

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

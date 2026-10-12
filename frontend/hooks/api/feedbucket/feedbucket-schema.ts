import { z } from "zod";
import { feedbucketWidgetRowContract } from "./feedbucket-widget-schema";

const feedbucketMetadataContract = z.object({
  browser: z.string().optional(),
  browserVersion: z.string().optional(),
  os: z.string().optional(),
  device: z.string().optional(),
  screenW: z.number().optional(),
  screenH: z.number().optional(),
  viewportW: z.number().optional(),
  viewportH: z.number().optional(),
  userAgent: z.string().optional(),
  language: z.string().optional(),
  referrer: z.string().optional(),
});

const feedbucketConsoleEntryContract = z.object({
  level: z.string(),
  message: z.string(),
  ts: z.number().optional(),
});

const feedbucketNetworkEntryContract = z.object({
  method: z.string(),
  url: z.string(),
  status: z.number(),
  statusText: z.string(),
  durationMs: z.number(),
  startedAt: z.string(),
  type: z.enum(["xhr", "fetch"]),
  ok: z.boolean(),
  error: z.string().optional(),
});

const feedbucketAiAnalysisContract = z.object({
  type: z.enum([
    "bug",
    "feature",
    "improvement",
    "question",
    "praise",
    "other",
  ]),
  confidence: z.number(),
  suggestedTicketType: z.enum(["EPIC", "BUG", "STORY", "TASK"]),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  reproductionSteps: z.array(z.string()),
  suggestions: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  model: z.string(),
  processedAt: z.string(),
});

export const feedbucketRotateKeyContract = z.object({ publicKey: z.string() });

const feedbucketSubmissionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  widgetId: z.number(),
  type: z.enum(["bug", "idea", "feature", "question", "praise", "other"]),
  status: z.enum(["open", "in_progress", "resolved", "archived"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable(),
  message: z.string(),
  pageUrl: z.string().nullable(),
  screenshotUrl: z.string().nullable(),
  screenshotKey: z.string().nullable(),
  metadata: feedbucketMetadataContract.nullable(),
  consoleLogs: z.array(feedbucketConsoleEntryContract).nullable().optional(),
  networkLogs: z.array(feedbucketNetworkEntryContract).nullable().optional(),
  reporterName: z.string().nullable(),
  reporterEmail: z.string().nullable(),
  crmContactId: z.number().nullable(),
  crmOrganizationId: z.number().nullable(),
  accountValueSnapshot: z.string().nullable(),
  assigneeMembershipId: z.number().nullable(),
  assignee: z
    .object({ id: z.number(), name: z.string(), avatarUrl: z.string().nullable() })
    .nullable(),
  linkedTicketId: z.number().nullable(),
  linkedTicketKey: z.string().nullable(),
  aiType: z.string().nullable(),
  aiConfidence: z.number().nullable(),
  aiAnalysis: feedbucketAiAnalysisContract.nullable(),
  aiModel: z.string().nullable(),
  aiProcessedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  sourceChannel: z.enum([
    "widget",
    "feedbucket",
    "email",
    "support",
    "sales",
    "interview",
    "survey",
    "public_portal",
    "manual",
    "import",
  ]),
  segment: z.string().nullable(),
  theme: z.string().nullable(),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).nullable(),
  consentStatus: z.enum(["granted", "denied", "unknown"]),
  consentRecordedAt: z.string().nullable(),
  duplicateOfId: z.number().nullable(),
  duplicateCount: z.coerce.number().int().nonnegative(),
  opportunityIds: z.array(z.number()),
  customer: z
    .object({ crmOrganizationId: z.number(), name: z.string().nullable() })
    .nullable(),
  revision: z.string(),
  sourceFreshness: z.string(),
  allowedActions: z.array(z.string()),
});

export const feedbucketSubmissionListContract = z.object({
  data: z.array(
    feedbucketSubmissionRowContract.and(
      z.object({ widget: feedbucketWidgetRowContract.nullable() }),
    ),
  ),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
  page: z.number().optional(),
  total: z.number().optional(),
  totalPages: z.number().optional(),
});

export const feedbucketBulkSubmissionsContract = z.object({
  requested: z.number(),
  succeeded: z.number(),
  skipped: z.number(),
  results: z.array(
    z.object({
      submissionId: z.number(),
      outcome: z.enum(["updated", "deleted", "skipped"]),
      reason: z.enum(["not_found_or_filtered"]).nullable(),
    }),
  ),
});

export const feedbucketSubmissionDetailContract =
  feedbucketSubmissionRowContract.and(
    z.object({
      widget: feedbucketWidgetRowContract.nullable(),
      linkedTicket: z
        .object({
          id: z.number(),
          orgId: z.string(),
          projectId: z.number(),
          title: z.string(),
          type: z.string(),
          status: z.string(),
        })
        .nullable(),
      recordingUrl: z.string().nullable(),
    }),
  );

export const feedbucketConvertTicketContract = z.object({
  ticketId: z.number(),
});

const aiUsageMetaContract = z.object({
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  credits: z.number(),
  costUsd: z.number(),
});

export const feedbucketFeedbackAnalysisContract = z.object({
  type: z.enum([
    "bug",
    "feature",
    "improvement",
    "question",
    "praise",
    "other",
  ]),
  confidence: z.number(),
  suggestedTicketType: z.enum(["EPIC", "BUG", "STORY", "TASK"]),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  reproductionSteps: z.array(z.string()),
  suggestions: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  model: z.string(),
  processedAt: z.string(),
  aiUsage: aiUsageMetaContract.optional(),
});

export const feedbucketCreateTicketFromAnalysisContract = z.object({
  ticketId: z.number(),
  ticketType: z.enum(["EPIC", "BUG", "STORY", "TASK"]),
});

export const feedbucketUpdateSubmissionContract =
  feedbucketSubmissionRowContract;

export const feedbucketDeleteSubmissionContract = z.object({
  success: z.literal(true),
});

export const feedbucketClassifySubmissionContract = z.object({
  id: z.number(),
  theme: z.string().nullable(),
  segment: z.string().nullable(),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).nullable(),
  consentStatus: z.enum(["granted", "denied", "unknown"]),
  consentRecordedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const feedbucketMarkDuplicateContract = z.object({
  id: z.number(),
  duplicateOfId: z.number(),
});

export const feedbucketUnmarkDuplicateContract = z.object({
  id: z.number(),
});

export type FeedbucketClassifyResult = z.infer<typeof feedbucketClassifySubmissionContract>;
export type FeedbucketMarkDuplicateResult = z.infer<typeof feedbucketMarkDuplicateContract>;
export type FeedbucketUnmarkDuplicateResult = z.infer<typeof feedbucketUnmarkDuplicateContract>;

export const feedbucketCaptureSubmissionContract = z.object({
  submissionId: z.number(),
  widgetId: z.number(),
  widgetCreated: z.boolean(),
});

const feedbucketFacetCountContract = z.object({
  value: z.string().nullable(),
  count: z.number(),
});

export const feedbucketSubmissionFacetsContract = z.object({
  themes: z.array(feedbucketFacetCountContract),
  segments: z.array(feedbucketFacetCountContract),
  sourceChannels: z.array(feedbucketFacetCountContract).optional(),
});

export type FeedbucketSubmissionRow = z.infer<
  typeof feedbucketSubmissionRowContract
>;

export const feedbucketCustomerImpactContract = z.object({
  rows: z.array(
    z.object({
      crmOrganizationId: z.number().int(),
      customerName: z.string().nullable(),
      submissionCount: z.number().int(),
      opportunityCount: z.number().int(),
      accountValue: z.string().nullable(),
      segments: z.array(z.string()),
      tier: z.string().nullable(),
    }),
  ),
});

export type FeedbucketCustomerImpactRow = z.infer<
  typeof feedbucketCustomerImpactContract
>["rows"][number];

export const feedbucketOpportunityImpactContract = z.object({
  rows: z.array(
    z.object({
      opportunityId: z.number().int(),
      distinctCustomers: z.number().int(),
      segments: z.array(z.string()),
      requestCount: z.number().int(),
      summedAccountValue: z.string().nullable(),
    }),
  ),
});

export type FeedbucketOpportunityImpactRow = z.infer<
  typeof feedbucketOpportunityImpactContract
>["rows"][number];

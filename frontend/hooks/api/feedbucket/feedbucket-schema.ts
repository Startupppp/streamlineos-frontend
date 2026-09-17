import { z } from "zod";

const feedbucketWidgetThemeContract = z.object({
  color: z.string().optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  label: z.string().optional(),
});

const feedbucketWidgetRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number().nullable(),
  managedProductId: z.number().nullable(),
  defaultProjectId: z.number().nullable(),
  defaultAssigneeMembershipId: z.number().nullable(),
  assigneeRules: z.object({
    bug: z.number().optional(),
    idea: z.number().optional(),
    feature: z.number().optional(),
    question: z.number().optional(),
    praise: z.number().optional(),
    other: z.number().optional(),
  }).nullable(),
  name: z.string(),
  publicKey: z.string(),
  allowedDomains: z.array(z.string()),
  autoCreateTicket: z.boolean(),
  defaultTicketType: z.string(),
  isActive: z.boolean(),
  aiAssistEnabled: z.boolean(),
  theme: feedbucketWidgetThemeContract.nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const projectMinimalContract = z.object({
  id: z.number(),
  name: z.string(),
  key: z.string(),
  orgId: z.string(),
});

const feedbucketWidgetListItemContract = feedbucketWidgetRowContract.and(
  z.object({
    project: projectMinimalContract.nullable(),
    submissionCount: z.number(),
    openCount: z.number(),
  }),
);

export const feedbucketWidgetListContract = z.array(feedbucketWidgetListItemContract);

export const feedbucketWidgetWithProjectContract = feedbucketWidgetRowContract.and(
  z.object({ project: projectMinimalContract.nullable() }),
);

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
  type: z.enum(["bug", "feature", "improvement", "question", "praise", "other"]),
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
  linkedTicketId: z.number().nullable(),
  aiType: z.string().nullable(),
  aiConfidence: z.number().nullable(),
  aiAnalysis: feedbucketAiAnalysisContract.nullable(),
  aiModel: z.string().nullable(),
  aiProcessedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const feedbucketSubmissionListContract = z.object({
  data: z.array(
    feedbucketSubmissionRowContract.and(
      z.object({ widget: feedbucketWidgetRowContract.nullable() }),
    ),
  ),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const feedbucketSubmissionDetailContract = feedbucketSubmissionRowContract.and(
  z.object({
    widget: feedbucketWidgetRowContract.nullable(),
    linkedTicket: z.object({
      id: z.number(),
      orgId: z.string(),
      projectId: z.number(),
      title: z.string(),
      type: z.string(),
      status: z.string(),
    }).nullable(),
    recordingUrl: z.string().nullable(),
  }),
);

export const feedbucketConvertTicketContract = z.object({ ticketId: z.number() });

const aiUsageMetaContract = z.object({
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  credits: z.number(),
  costUsd: z.number(),
});

export const feedbucketFeedbackAnalysisContract = z.object({
  type: z.enum(["bug", "feature", "improvement", "question", "praise", "other"]),
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

export const feedbucketUpdateSubmissionContract = feedbucketSubmissionRowContract;

export const feedbucketDeleteSubmissionContract = z.object({ success: z.literal(true) });

export type FeedbucketSubmissionRow = z.infer<typeof feedbucketSubmissionRowContract>;

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
  metadata: z.unknown().nullable(),
  consoleLogs: z.unknown().nullable().optional(),
  networkLogs: z.unknown().nullable().optional(),
  reporterName: z.string().nullable(),
  reporterEmail: z.string().nullable(),
  crmContactId: z.number().nullable(),
  crmOrganizationId: z.number().nullable(),
  accountValueSnapshot: z.string().nullable(),
  assigneeMembershipId: z.number().nullable(),
  linkedTicketId: z.number().nullable(),
  aiType: z.string().nullable(),
  aiConfidence: z.number().nullable(),
  aiAnalysis: z.unknown().nullable(),
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
  ticketType: z.string(),
});

export const feedbucketUpdateSubmissionContract = feedbucketSubmissionRowContract.and(
  z.object({ widget: feedbucketWidgetRowContract.nullable() }),
);

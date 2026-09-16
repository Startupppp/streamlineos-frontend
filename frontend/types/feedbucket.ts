import type { z } from "zod";
import type { feedbucketSubmissionListContract } from "@/hooks/api/feedbucket/feedbucket-schema";
import type { feedbucketSubmissionDetailContract } from "@/hooks/api/feedbucket/feedbucket-schema";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

export type FeedbucketSubmissionType = "bug" | "idea" | "feature" | "question" | "praise" | "other";

export type FeedbucketAiType = "bug" | "feature" | "improvement" | "question" | "praise" | "other";
export type FeedbucketAiTicketType = "EPIC" | "BUG" | "STORY" | "TASK";
export type FeedbucketAiPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface FeedbucketAiAnalysis {
  type: FeedbucketAiType;
  confidence: number;
  suggestedTicketType: FeedbucketAiTicketType;
  title: string;
  summary: string;
  description: string;
  reproductionSteps: string[];
  suggestions: string[];
  acceptanceCriteria: string[];
  priority: FeedbucketAiPriority;
  model: string;
  processedAt: string;
  aiUsage?: AiUsageMeta | null;
}
export type FeedbucketSubmissionStatus = "open" | "in_progress" | "resolved" | "archived";
export type FeedbucketSubmissionPriority = "low" | "medium" | "high" | "urgent";

export interface FeedbucketWidgetTheme {
  color?: string;
  position?: "bottom-right" | "bottom-left";
  label?: string;
}

export interface FeedbucketMetadata {
  browser?: string;
  browserVersion?: string;
  os?: string;
  device?: string;
  screenW?: number;
  screenH?: number;
  viewportW?: number;
  viewportH?: number;
  userAgent?: string;
  language?: string;
  referrer?: string;
}

export interface FeedbucketConsoleEntry {
  level: string;
  message: string;
  ts?: number;
}

export interface FeedbucketNetworkEntry {
  method: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  startedAt: string;
  type: "xhr" | "fetch";
  ok: boolean;
  error?: string;
}

export interface FeedbucketWidget {
  id: number;
  orgId: string;
  projectId: number | null;
  name: string;
  publicKey: string;
  allowedDomains: string[];
  autoCreateTicket: boolean;
  defaultTicketType: string;
  isActive: boolean;
  aiAssistEnabled: boolean;
  theme: FeedbucketWidgetTheme | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  defaultProjectId: number | null;
  defaultAssigneeMembershipId: number | null;
  assigneeRules: Partial<Record<FeedbucketSubmissionType, number>> | null;
  project?: { id: number; name: string; key: string } | null;
  submissionCount?: number;
  openCount?: number;
}

export type FeedbucketSubmission = z.infer<typeof feedbucketSubmissionDetailContract>;

export interface CreateFeedbucketWidgetInput {
  name: string;
  projectId?: number | null;
  allowedDomains?: string[];
  autoCreateTicket?: boolean;
  defaultTicketType?: string;
  aiAssistEnabled?: boolean;
  theme?: FeedbucketWidgetTheme;
  defaultProjectId?: number | null;
  defaultAssigneeId?: string | null;
  assigneeRules?: Partial<Record<FeedbucketSubmissionType, string>> | null;
}

export interface UpdateFeedbucketWidgetInput {
  name?: string;
  projectId?: number | null;
  allowedDomains?: string[];
  autoCreateTicket?: boolean;
  defaultTicketType?: string;
  isActive?: boolean;
  aiAssistEnabled?: boolean;
  theme?: FeedbucketWidgetTheme;
  defaultProjectId?: number | null;
  defaultAssigneeId?: string | null;
  assigneeRules?: Partial<Record<FeedbucketSubmissionType, string>> | null;
}

export interface ListFeedbucketSubmissionsQuery {
  page?: number;
  limit?: number;
  widgetId?: number;
  type?: FeedbucketSubmissionType;
  status?: FeedbucketSubmissionStatus;
  assigneeId?: string;
  search?: string;
}

export interface UpdateFeedbucketSubmissionInput {
  status?: FeedbucketSubmissionStatus;
  priority?: FeedbucketSubmissionPriority | null;
  assigneeId?: string | null;
}

export type PaginatedFeedbucketSubmissions = z.infer<typeof feedbucketSubmissionListContract>;

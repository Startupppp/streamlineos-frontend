export type FeedbucketSubmissionType = "bug" | "idea" | "question" | "praise" | "other";
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
  theme: FeedbucketWidgetTheme | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: number; name: string; key: string } | null;
  submissionCount?: number;
  openCount?: number;
}

export interface FeedbucketSubmissionUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  image: string | null;
}

export interface FeedbucketSubmission {
  id: number;
  orgId: string;
  widgetId: number;
  type: FeedbucketSubmissionType;
  status: FeedbucketSubmissionStatus;
  priority: FeedbucketSubmissionPriority | null;
  message: string;
  pageUrl: string | null;
  screenshotUrl: string | null;
  metadata: FeedbucketMetadata | null;
  consoleLogs: FeedbucketConsoleEntry[] | null;
  reporterName: string | null;
  reporterEmail: string | null;
  assigneeId: string | null;
  linkedTicketId: number | null;
  createdAt: string;
  updatedAt: string;
  widget?: { id: number; name: string; projectId: number | null } | null;
  assignee?: FeedbucketSubmissionUser | null;
}

export interface CreateFeedbucketWidgetInput {
  name: string;
  projectId?: number | null;
  allowedDomains?: string[];
  autoCreateTicket?: boolean;
  defaultTicketType?: string;
  theme?: FeedbucketWidgetTheme;
}

export interface UpdateFeedbucketWidgetInput {
  name?: string;
  projectId?: number | null;
  allowedDomains?: string[];
  autoCreateTicket?: boolean;
  defaultTicketType?: string;
  isActive?: boolean;
  theme?: FeedbucketWidgetTheme;
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

export interface FeedbucketStats {
  total: number;
  byStatus: Record<FeedbucketSubmissionStatus, number>;
  byType: Record<FeedbucketSubmissionType, number>;
}

export interface PaginatedFeedbucketSubmissions {
  data: FeedbucketSubmission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

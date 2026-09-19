import type {
  ProjectStatusValue,
  ViewLayoutType,
  IntakeStatus,
  IntakeSource,
  CycleStatus,
  ModuleStatus,
} from "./shared";
import type { Ticket } from "./tasks";

export interface ProjectSettings {
  modules: {
    sprints: boolean;
    epics: boolean;
    timeTracking: boolean;
    wiki: boolean;
  };
  projectType?: string;
  workflow?: string;
  features?: Record<string, boolean>;
}

export interface Project {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  key: string;
  clientId?: string | null;
  clientMembershipId?: number | null;
  managerId?: string | null;
  managerMembershipId?: number | null;
  managedProductId: number | null;
  pmWorkspaceId: string | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
  status: ProjectStatusValue | null;
  settings: ProjectSettings | null;
}

export interface ProjectStatusRecord {
  id: number;
  orgId: string;
  projectId: number;
  name: string;
  order: number;
  color: string | null;
  type?: string | null;
  wipLimit?: number | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: string;
  role: string | null;
  joinedAt: string | Date | null;
  user?: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface ProjectMemberRecord {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
  role: string | null;
}

export interface ProjectWithDetails extends Project {
  statuses?: ProjectStatusRecord[];
  members?: ProjectMember[];
  tickets?: Ticket[];
}

export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectHealth = "on_track" | "at_risk" | "off_track";

export interface ProjectListItem {
  id: number;
  name: string;
  description: string | null;
  key: string;
  status: ProjectStatusValue | null;
  priority: ProjectPriority | null;
  health: ProjectHealth;
  managedProductId: number | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
  manager: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
  progress: { total: number; done: number; percentage: number };
  members: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  }[];
  teams: string[];
}

export interface Cycle {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  description: string | null;
  status: CycleStatus;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  totalItems?: number;
  completedItems?: number;
  progress?: number;
}

export interface Module {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  description: string | null;
  status: ModuleStatus;
  leadId: string | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  totalItems?: number;
  completedItems?: number;
  progress?: number;
}

export interface ProjectView {
  id: number;
  projectId: number | null;
  orgId: string;
  createdBy: string;
  name: string;
  filters: Record<string, unknown>;
  groupBy: string | null;
  orderBy: string | null;
  layoutType: ViewLayoutType;
  isPinned: boolean;
  visibility: "private" | "shared";
  scope: "project" | "workspace";
  displayOptions: Record<string, unknown> | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface IntakeRequest {
  id: number;
  projectId: number;
  orgId: string;
  title: string;
  description: unknown | null;
  source: IntakeSource;
  status: IntakeStatus;
  submitterEmail: string | null;
  submitterName: string | null;
  priority: "low" | "medium" | "high" | "urgent" | null;
  requestType: "bug" | "feature" | "task" | "question" | "other" | null;
  linkedWorkItemId: number | null;
  declineReason: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface ProjectAnalytics {
  stateDistribution: { status: string; count: number }[];
  priorityBreakdown: { priority: string | null; count: number }[];
  assigneeCompletion: {
    assigneeId: string | null;
    assigneeName: string | null;
    total: number;
    completed: number;
  }[];
  volumeOverTime: { week: string; count: number }[];
  cycleVelocity: {
    cycleId: number;
    cycleName: string;
    completedPoints: number;
  }[];
  estimateVsActual: {
    ticketId: number;
    title: string;
    estimated: string | null;
    actual: number;
  }[];
  healthScore?: number;
  healthStatus?: string;
  healthBreakdown?: {
    completionPct: number;
    onTimePct: number;
    velocityScore: number;
    overdueTickets: number;
    totalTickets: number;
  };
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  key?: string;
  managerId?: string;
  clientId?: string;
  memberIds?: string[];
  endDate?: Date | string;
  startDate?: Date | string;
  priority?: ProjectPriority;
  modules?: {
    sprints: boolean;
    epics: boolean;
    timeTracking: boolean;
    wiki: boolean;
  };
  projectType?: string;
  workflow?: string;
  features?: Record<string, boolean>;
  pmWorkspaceId?: string;
  managedProductId?: number;
}

export interface UpdateProjectInput {
  projectId: number;
  name?: string;
  description?: string;
  status?: ProjectStatusValue;
  priority?: ProjectPriority;
  managerId?: string | null;
  clientId?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  memberIds?: string[];
  reassignments?: Record<string, string>;
  projectType?: string;
  workflow?: string;
  features?: Record<string, boolean>;
}

export interface AddProjectMemberInput {
  projectId: number;
  userId: string;
  role?: string;
}

export interface CreateCycleInput {
  projectId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface CreateModuleInput {
  projectId: number;
  name: string;
  description?: string;
  status?: ModuleStatus;
  leadId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateViewInput {
  projectId: number;
  name: string;
  filters?: Record<string, unknown>;
  groupBy?: string;
  orderBy?: string;
  layoutType?: ViewLayoutType;
  isPinned?: boolean;
  visibility?: "private" | "shared";
  displayOptions?: Record<string, unknown>;
}

export interface UpdateViewInput {
  viewId: number;
  name?: string;
  filters?: Record<string, unknown>;
  groupBy?: string | null;
  orderBy?: string | null;
  layoutType?: ViewLayoutType;
  isPinned?: boolean;
  visibility?: "private" | "shared";
  displayOptions?: Record<string, unknown>;
}

export interface CreateWorkspaceViewInput {
  name: string;
  filters?: Record<string, unknown>;
  groupBy?: string;
  orderBy?: string;
  layoutType?: ViewLayoutType;
  isPinned?: boolean;
  visibility?: "private" | "shared";
  displayOptions?: Record<string, unknown>;
}

export interface UpdateWorkspaceViewInput {
  viewId: number;
  name?: string;
  filters?: Record<string, unknown>;
  groupBy?: string | null;
  orderBy?: string | null;
  layoutType?: ViewLayoutType;
  isPinned?: boolean;
  visibility?: "private" | "shared";
  displayOptions?: Record<string, unknown>;
}

export interface CreateIntakeRequestInput {
  projectId: number;
  title: string;
  description?: unknown;
  source?: IntakeSource;
  submitterEmail?: string;
  submitterName?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  requestType?: "bug" | "feature" | "task" | "question" | "other";
}

export interface UpdateIntakeRequestInput {
  intakeRequestId: number;
  status?: IntakeStatus;
  declineReason?: string;
  linkedWorkItemId?: number;
}

/**
 * Mirrors `listProjectsSchema` in the backend's `build/core/dto`, which is
 * `.strict()` — a field this type carries and that schema does not is not
 * ignored, it is a 400 on every request. `page` used to sit here and
 * `projects-page.tsx` sent it, which is what made `/build` render
 * "Failed to load projects" at every width. `GET /build` is keyset:
 * it orders by descending id and takes `afterId`, so there is no page number
 * to send and no total to receive.
 */
export interface ProjectFilters {
  afterId?: number;
  limit?: number;
  search?: string;
  status?: "ALL" | ProjectStatusValue;
  pmWorkspaceId?: string;
  managedProductId?: number;
}

/** What `GET /build` actually answers. */
export interface ProjectListResponse {
  data: ProjectListItem[];
  hasMore: boolean;
  nextCursor: number | null;
}

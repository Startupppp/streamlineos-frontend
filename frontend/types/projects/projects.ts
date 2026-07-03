import type {
  ProjectStatusValue,
  ViewLayoutType,
  IntakeStatus,
  IntakeSource,
  StateGroup,
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
}

export interface Project {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  key: string;
  clientId: string | null;
  managerId: string | null;
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

export interface ProjectWithDetails extends Project {
  statuses?: ProjectStatusRecord[];
  members?: ProjectMember[];
  tickets?: Ticket[];
}

export interface ProjectListItem {
  id: number;
  name: string;
  description: string | null;
  key: string;
  status: ProjectStatusValue | null;
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

export interface CycleWithStats extends Cycle {
  stats?: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    progress: number;
  };
  workItems?: Ticket[];
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

export interface ProjectPage {
  id: number;
  projectId: number;
  orgId: string;
  title: string;
  content: unknown | null;
  icon: string | null;
  coverImage: string | null;
  isPublic: boolean;
  isPinned: boolean;
  parentPageId: number | null;
  createdBy: string;
  updatedAt: string | Date | null;
  createdAt: string | Date | null;
  children?: ProjectPage[];
}

export interface ProjectView {
  id: number;
  projectId: number;
  orgId: string;
  createdBy: string;
  name: string;
  filters: Record<string, unknown>;
  groupBy: string | null;
  orderBy: string | null;
  layoutType: ViewLayoutType;
  isPinned: boolean;
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
  linkedWorkItemId: number | null;
  declineReason: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface CustomState {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  color: string;
  group: StateGroup;
  sequence: number;
  isDefault: boolean;
  createdAt: string | Date | null;
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
  modules?: {
    sprints: boolean;
    epics: boolean;
    timeTracking: boolean;
    wiki: boolean;
  };
}

export interface UpdateProjectInput {
  projectId: number;
  name?: string;
  description?: string;
  status?: ProjectStatusValue;
  managerId?: string;
  clientId?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  memberIds?: string[];
  reassignments?: Record<string, string>;
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

export interface UpdateCycleInput {
  id: number;
  name?: string;
  description?: string;
  status?: CycleStatus;
  startDate?: string;
  endDate?: string;
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

export interface UpdateModuleInput {
  id: number;
  name?: string;
  description?: string;
  status?: ModuleStatus;
  leadId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CreatePageInput {
  projectId: number;
  title: string;
  content?: unknown;
  icon?: string;
  parentPageId?: number;
}

export interface UpdatePageInput {
  id: number;
  title?: string;
  content?: unknown;
  icon?: string | null;
  coverImage?: string | null;
  isPublic?: boolean;
  isPinned?: boolean;
  parentPageId?: number | null;
}

export interface CreateViewInput {
  projectId: number;
  name: string;
  filters?: Record<string, unknown>;
  groupBy?: string;
  orderBy?: string;
  layoutType?: ViewLayoutType;
  isPinned?: boolean;
}

export interface UpdateViewInput {
  id: number;
  name?: string;
  filters?: Record<string, unknown>;
  groupBy?: string | null;
  orderBy?: string | null;
  layoutType?: ViewLayoutType;
  isPinned?: boolean;
}

export interface CreateIntakeRequestInput {
  projectId: number;
  title: string;
  description?: unknown;
  source?: IntakeSource;
  submitterEmail?: string;
}

export interface UpdateIntakeRequestInput {
  id: number;
  status?: IntakeStatus;
  declineReason?: string;
  linkedWorkItemId?: number;
}

export interface CreateCustomStateInput {
  projectId: number;
  name: string;
  color: string;
  group: StateGroup;
  sequence: number;
  isDefault?: boolean;
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ALL" | ProjectStatusValue;
}

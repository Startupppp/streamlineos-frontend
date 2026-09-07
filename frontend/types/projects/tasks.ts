import type { TicketPriority } from "./shared";

export interface TicketUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  image: string | null;
}

export interface CommentReaction {
  emoji: string;
  userId: string;
}

export interface TicketComment {
  id: number;
  orgId: string;
  ticketId: number;
  userId: string;
  content: string;
  parentCommentId: number | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  user?: TicketUser;
  reactions?: CommentReaction[];
}

export interface TicketAttachment {
  id: number;
  orgId: string;
  ticketId: number;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  createdAt: string | Date | null;
  uploader?: TicketUser;
}

export interface TicketLabel {
  id: number;
  orgId: string;
  name: string;
  color: string | null;
  createdAt: string | Date | null;
}

interface TicketLabelMapping {
  id: number;
  ticketId: number;
  labelId: number;
  createdAt: string | Date | null;
  label?: TicketLabel;
}

export interface TicketAssignee {
  id: number;
  ticketId: number;
  userId: string;
  assignedAt: string | Date | null;
  assignedBy: string | null;
  user?: TicketUser;
}

/**
 * `userId` is nullable because a watcher whose organization row is gone flattens to nulls
 * rather than to missing keys — the backend lifts both off the `organization_members` join.
 */
export interface TicketWatcher {
  id: number;
  ticketId: number;
  userId: string | null;
  createdAt: string | Date | null;
  user?: TicketUser | null;
}

export interface Ticket {
  id: number;
  orgId: string;
  title: string;
  /**
   * Absent on list and board responses, which project it away rather than ship a
   * body no column renders. Present on the detail read. Optional so a consumer
   * has to handle the absence instead of trusting a null that never arrives.
   */
  description?: string | null;
  type: string;
  status: string;
  priority: string | null;
  projectId: number | null;
  ticketNumber: number;
  sprintId: number | null;
  epicId: number | null;
  assigneeId?: string | null;
  reporterId: string | null;
  points: number | null;
  storyPoints: number | null;
  link: string | null;
  rank: string | null;
  parentTicketId: number | null;
  originalEstimate: string | null;
  timeSpent: string | null;
  startDate: string | null;
  dueDate: string | null;
  stateId?: number | null;
  moduleId: number | null;
  cycleId: number | null;
  sequenceId: string | null;
  estimate: number | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  assignee?: TicketUser | null;
  reporter?: TicketUser | null;
  assignees?: TicketAssignee[];
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  labels?: TicketLabelMapping[];
  watchers?: TicketWatcher[];
  project?: { id: number; name: string; key: string } | null;
  sprint?: { id: number; name: string } | null;
  cycle?: { id: number; name: string; status: string; startDate: string; endDate: string } | null;
  customerId?: number | null;
  customer?: { id: number; name: string } | null;
}

export type Epic = Ticket;

export interface TimeEntry {
  id: number;
  orgId: string;
  userId: string | null;
  ticketId: number | null;
  date: string;
  hours: string | null;
  description: string | null;
  imageUrl: string | null;
  workLink: string | null;
  status: string | null;
  approvedBy: string | null;
  approvedAt: string | Date | null;
  rejectionReason: string | null;
  isBillable: boolean | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface CreateTicketInput {
  projectId: number;
  title: string;
  description?: string;
  type: string;
  priority?: TicketPriority;
  assigneeId?: string;
  assigneeIds?: string[];
  reporterId?: string;
  sprintId?: number;
  epicId?: number;
  cycleId?: number;
  points?: number;
  link?: string;
  originalEstimate?: number;
  parentTicketId?: number;
  status?: string;
  dueDate?: string;
}

export interface UpdateTicketInput {
  ticketId: number;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: TicketPriority;
  assigneeId?: string;
  assigneeIds?: string[];
  sprintId?: number | null;
  epicId?: number | null;
  moduleId?: number | null;
  cycleId?: number | null;
  points?: number | null;
  originalEstimate?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  expectedUpdatedAt?: string;
  customerId?: number | null;
  parentTicketId?: number | null;
}

export interface RankTicketInput {
  projectId: number;
  ticketId: number;
  beforeTicketId?: number | null;
  afterTicketId?: number | null;
  status?: string;
}

export interface LogTimeInput {
  projectId: number;
  ticketId: number;
  date: Date | string;
  hours: number;
  description?: string;
  imageUrl?: string;
  workLink?: string;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
}

export interface TicketFilters {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  type?: string;
  assigneeId?: string;
  labelIds?: string;
  sprintId?: number;
  cycleId?: string;
  epicId?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  orderBy?: "created" | "updated" | "priority" | "dueDate" | "rank";
  orderDir?: "asc" | "desc";
}

export interface AllWorkFilters extends TicketFilters {
  projectIds?: string;
  excludeStatus?: string;
  scope?: "all" | "mine" | "created" | "subscribed";
  pmWorkspaceId?: string;
}

export interface AllWorkTicketLabel {
  id: number;
  name: string;
  color: string;
}

export interface AllWorkTicket {
  id: number;
  title: string;
  type: string;
  status: string;
  priority: string | null;
  projectId: number | null;
  projectKey: string | null;
  projectName: string | null;
  ticketNumber: number;
  sprintId: number | null;
  epicId: number | null;
  assigneeId: string | null;
  points: number | null;
  estimate: number | null;
  rank: string | null;
  startDate: string | null;
  dueDate: string | null;
  cycleId: number | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  assignee: TicketUser | null;
  labels: AllWorkTicketLabel[];
}

export interface ChecklistItem {
  id: number;
  checklistId: number;
  text: string;
  isCompleted: boolean;
  assigneeId: string | null;
  dueDate: string | null;
  order: number;
  createdAt: string;
}

export interface Checklist {
  id: number;
  ticketId: number;
  orgId: string;
  title: string;
  items?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "user"
  | "select"
  | "multi_select"
  | "checkbox"
  | "url"
  | "currency";

export interface ProjectCustomField {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  type: CustomFieldType;
  options: string[] | null;
  required: boolean;
  position: number;
  createdAt: string;
}

export interface TicketCustomFieldValue {
  id: number;
  ticketId: number;
  fieldId: number;
  field: ProjectCustomField;
  value: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketSearchResult {
  id: number;
  title: string;
  status: string;
  priority: string;
  ticketNumber: number;
  projectId: number;
  projectKey: string;
  projectName: string;
}

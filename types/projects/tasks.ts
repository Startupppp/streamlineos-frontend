import type { TicketPriority } from "./shared";

export interface TicketUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  image: string | null;
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

export interface TicketLabelMapping {
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

export interface TicketWatcher {
  id: number;
  ticketId: number;
  userId: string;
  createdAt: string | Date | null;
  user?: TicketUser;
}

export interface Ticket {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: TicketPriority | null;
  projectId: number | null;
  ticketNumber: number;
  sprintId: number | null;
  epicId: number | null;
  assigneeId: string | null;
  reporterId: string | null;
  points: number | null;
  storyPoints: number | null;
  link: string | null;
  order: number | null;
  parentTicketId: number | null;
  originalEstimate: string | null;
  timeSpent: string | null;
  startDate: string | null;
  dueDate: string | null;
  stateId: number | null;
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

export interface TimeEntryWithUser extends TimeEntry {
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    projectId: number | null;
    project?: { id: number; name: string; key: string } | null;
  } | null;
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
  points?: number;
  link?: string;
  originalEstimate?: number;
  parentTicketId?: number;
  status?: string;
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
  points?: number | null;
  originalEstimate?: number | null;
}

export interface UpdateTicketStatusInput {
  ticketId: number;
  status: string;
}

export interface MoveTicketInput {
  projectId: number;
  items: { id: number; status: string; order: number }[];
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

export interface UpdateTimeEntryInput {
  entryId: number;
  hours?: number;
  description?: string;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
}

export interface TicketFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sprintId?: number;
  assigneeId?: string;
}

export interface TimeEntryFilters {
  ticketId?: number;
  userId?: string;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  status?: import("./shared").TimesheetStatus;
}

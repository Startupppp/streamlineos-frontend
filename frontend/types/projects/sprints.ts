import type { SprintStatus } from "./shared";
import type { TicketUser } from "./tasks";

export interface SprintTicket {
  id: number;
  title: string;
  status: string;
  points: number | null;
  sprintId: number | null;
  type?: string | null;
  priority?: string | null;
  ticketNumber?: number | null;
  assigneeId?: string | null;
  assignee?: TicketUser | null;
}

export interface Sprint {
  id: number;
  orgId: string;
  projectId: number | null;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  goal: string | null;
  status: string | null;
  tickets?: SprintTicket[];
}

export interface CreateSprintInput {
  projectId: number;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  goal?: string;
}

export interface UpdateSprintInput {
  sprintId: number;
  name?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  goal?: string;
  status?: SprintStatus;
}

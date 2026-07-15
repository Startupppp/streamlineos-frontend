import type { SprintStatus } from "./shared";
import type { Ticket } from "./tasks";

export interface Sprint {
  id: number;
  orgId: string;
  projectId: number | null;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  goal: string | null;
  status: string | null;
  tickets?: Ticket[];
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

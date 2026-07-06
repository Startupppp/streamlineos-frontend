export type MeetingType = "meeting" | "standup" | "retro" | "planning" | "review";
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type ActionItemStatus = "open" | "in_progress" | "done" | "converted" | "cancelled";

export interface Meeting {
  id: number;
  projectId: number;
  meetingNumber: number;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  agenda: string | null;
  notes: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  sprintId: number | null;
  attendeeCount?: number;
  actionItemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingAttendee {
  id: number;
  meetingId: number;
  userId: string;
  attended: boolean;
}

export interface ActionItem {
  id: number;
  meetingId: number;
  projectId: number;
  title: string;
  description: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  status: ActionItemStatus;
  convertedTicketId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StandupEntry {
  id: number;
  meetingId: number;
  userId: string;
  yesterday: string | null;
  today: string | null;
  blockers: string | null;
}

export interface MeetingDetail extends Meeting {
  attendees: MeetingAttendee[];
  actionItems: ActionItem[];
  standupEntries: StandupEntry[];
}

export interface CreateMeetingInput {
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  agenda?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  sprintId?: number;
}

export interface UpdateMeetingInput {
  id: number;
  title?: string;
  type?: MeetingType;
  status?: MeetingStatus;
  agenda?: string | null;
  notes?: string | null;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  sprintId?: number | null;
}

export interface CreateActionItemInput {
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status?: ActionItemStatus;
}

export interface UpdateActionItemInput {
  id: number;
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  status?: ActionItemStatus;
}

export interface UpsertStandupInput {
  yesterday?: string;
  today?: string;
  blockers?: string;
}

export interface AddAttendeeInput {
  userId: string;
}

import type { z } from "zod";
import type { addAttendeeResultContract } from "@/hooks/api/build/meetings-schema";
export type MeetingType = "meeting" | "standup" | "retro" | "planning" | "review";
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type ActionItemStatus = "open" | "in_progress" | "done" | "converted" | "cancelled";
export type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "custom";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  weekdays?: number[];
  endDate?: string;
  occurrences?: number;
}

export interface Meeting {
  id: number;
  orgId: string;
  projectId: number;
  meetingNumber: number;
  title: string;
  type: string;
  status: string;
  agenda: string | null;
  notes: string | null;
  scheduledAt: string | null;
  endAt: string | null;
  durationMinutes: number | null;
  timezone: string | null;
  recurrenceRule: unknown;
  sprintId: number | null;
  createdBy: string | null;
  attendeeCount?: number;
  actionItemCount?: number;
  unresolvedActionItemCount?: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MeetingAttendee = z.infer<typeof addAttendeeResultContract>;



export interface ActionItem {
  id: number;
  orgId: string;
  meetingId: number;
  projectId: number;
  title: string;
  description: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  status: string;
  convertedTicketId: number | null;
  createdBy: string | null;
  deletedAt: string | null;
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
  endAt?: string;
  durationMinutes?: number;
  timezone?: string;
  recurrenceRule?: RecurrenceRule;
  sprintId?: number;
  attendeeUserIds?: string[];
}

export interface UpdateMeetingInput {
  id: number;
  title?: string;
  type?: MeetingType;
  status?: MeetingStatus;
  agenda?: string | null;
  notes?: string | null;
  scheduledAt?: string | null;
  endAt?: string | null;
  durationMinutes?: number | null;
  timezone?: string | null;
  recurrenceRule?: RecurrenceRule | null;
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

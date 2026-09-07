import { z } from "zod";

const meetingRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  meetingNumber: z.number().int(),
  title: z.string(),
  type: z.string(),
  status: z.string(),
  agenda: z.string().nullable(),
  notes: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  endAt: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
  timezone: z.string().nullable(),
  recurrenceRule: z.unknown(),
  sprintId: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const meetingListItemContract = meetingRowContract.extend({
  attendeeCount: z.number().int(),
  actionItemCount: z.number().int(),
  unresolvedActionItemCount: z.number().int(),
});

export const meetingListContract = z.array(meetingListItemContract);

export { meetingRowContract };

export const actionItemRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  meetingId: z.number().int(),
  projectId: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
  status: z.string(),
  convertedTicketId: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const meetingAttendeeContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  meetingId: z.number().int(),
  membershipId: z.number().int(),
  attended: z.boolean(),
  createdAt: z.string(),
});

const standupEntryContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  meetingId: z.number().int(),
  userId: z.string(),
  membershipId: z.number().int().nullable(),
  yesterday: z.string().nullable(),
  today: z.string().nullable(),
  blockers: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const meetingDetailContract = meetingRowContract.extend({
  attendees: z.array(meetingAttendeeContract),
  actionItems: z.array(actionItemRowContract),
  standupEntries: z.array(standupEntryContract),
});

export const addAttendeeResultContract = z.object({
  meetingId: z.number().int(),
  userId: z.string(),
});

export const convertToTaskResultContract = z.object({
  actionItem: actionItemRowContract,
  ticketId: z.number().int(),
});

export const meetingsSuccessContract = z.object({ success: z.literal(true) });

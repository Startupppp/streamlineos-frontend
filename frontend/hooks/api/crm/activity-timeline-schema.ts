import { z } from "zod";

const timelineEntrySchema = z.object({
  activityId: z.string(),
  kind: z.enum(["call", "email", "meeting", "note", "task"]),
  occurredAt: z.string(),
  subject: z.string().nullable(),
  body: z.string().nullable(),
  threadId: z.string().nullable(),
  actorKind: z.enum(["human", "system"]),
  actorLabel: z.string().nullable(),
  actorName: z.string().nullable(),
  dueAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  source: z.string(),
});

const taskAnchorRefSchema = z.object({
  kind: z.enum(["party", "deal", "subject"]),
  id: z.string(),
  name: z.string().nullable(),
});

const taskEntrySchema = timelineEntrySchema.extend({
  anchor: taskAnchorRefSchema.nullable(),
});

const paginationSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const timelinePageContract = z.object({
  data: z.array(timelineEntrySchema),
  pagination: paginationSchema,
});

export const myTasksPageContract = z.object({
  data: z.array(taskEntrySchema),
  pagination: paginationSchema,
});

const activityParticipantSchema = z.object({
  activityParticipantId: z.string(),
  partyId: z.string().nullable(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  address: z.string().nullable(),
  role: z.string(),
});

export const activityParticipantsContract = z.object({
  data: z.array(activityParticipantSchema),
});

export const logActivityContract = timelineEntrySchema;
export const completeTaskContract = timelineEntrySchema;

import { z } from "zod";

const timelineAnchorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("party"), partyId: z.string() }),
  z.object({ kind: z.literal("deal"), dealId: z.string() }),
  z.object({ kind: z.literal("subject"), subjectId: z.string() }),
]);

const timelineEntrySchema = z.object({
  activityId: z.string(),
  kind: z.string(),
  occurredAt: z.string(),
  subject: z.string().nullable(),
  body: z.string().nullable(),
  threadId: z.string().nullable(),
  actorKind: z.string(),
  actorLabel: z.string().nullable(),
  actorName: z.string().nullable(),
  dueAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  source: z.string(),
  anchor: timelineAnchorSchema,
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

export const myTasksPageContract = timelinePageContract;

const activityParticipantSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export const activityParticipantsContract = z.object({
  data: z.array(activityParticipantSchema),
});

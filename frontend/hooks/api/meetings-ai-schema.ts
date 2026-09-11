import { z } from "zod";

const actionItemSchema = z.object({
  item: z.string(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
});

const followUpOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  actionItems: z.array(actionItemSchema),
  nextMeetingDate: z.string().optional(),
});

export const meetingFollowUpContract = z.object({
  followUp: followUpOutputSchema,
  eventTitle: z.string(),
});

export const proposeSendFollowUpContract = z.object({
  proposalId: z.number().int(),
  token: z.string(),
  expiresAt: z.string(),
});

export const confirmSendFollowUpContract = z.union([
  z.object({ executed: z.literal(true), channel: z.string() }),
  z.object({ executed: z.literal(false), error: z.string(), message: z.string() }),
]);

import { z } from "zod";

const candidateMessageRowSchema = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  direction: z.string(),
  channel: z.string(),
  subject: z.string().nullable(),
  body: z.string(),
  sentBy: z.string().nullable(),
  sentAt: z.string(),
  readAt: z.string().nullable(),
  externalId: z.string().nullable(),
  senderName: z.string().nullable(),
  candidateFirstName: z.string().nullable(),
  candidateLastName: z.string().nullable(),
  candidateEmail: z.string().nullable(),
});

const messageThreadItemSchema = z.object({
  candidateId: z.number().int(),
  lastMessageAt: z.string().nullable(),
  messageCount: z.number().int(),
  unreadCount: z.number().int(),
  lastBody: z.string().nullable(),
  lastDirection: z.string().nullable(),
  candidateFirstName: z.string().nullable(),
  candidateLastName: z.string().nullable(),
  candidateEmail: z.string().nullable(),
});

export const candidateMessagesListContract = z.array(candidateMessageRowSchema);

export const messageThreadsListContract = z.array(messageThreadItemSchema);

export const sendCandidateMessageContract = candidateMessageRowSchema;

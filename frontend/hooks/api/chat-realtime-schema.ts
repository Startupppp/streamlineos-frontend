import { z } from "zod";
import {
  chatMessageAttachmentContract,
  chatMessageMetadataContract,
} from "@/hooks/api/chat-schema/message-schema";

export const messagePayloadSchema = z.object({
  id: z.number(),
  channelId: z.number(),
  senderId: z.string().nullable(),
  senderName: z.string().nullable(),
  senderImage: z.string().nullable().optional(),
  content: z.string().nullable(),
  createdAt: z.string().nullable(),
  replyToId: z.number().nullable(),
  metadata: chatMessageMetadataContract.optional(),
  messageType: z.enum(["text", "lead_submission", "system"]).optional(),
  attachments: z.array(chatMessageAttachmentContract).optional(),
  idempotencyKey: z.string().optional(),
  clientKey: z.string().nullable().optional(),
});

export const messageUpdatedPayloadSchema = z.object({
  id: z.number(),
  channelId: z.number(),
  content: z.string().nullable(),
  isEdited: z.literal(true),
  updatedAt: z.string(),
});

export const messageEntitiesUpdatedPayloadSchema = z.object({
  id: z.number(),
  channelId: z.number(),
  entities: z.array(z.object({ type: z.string(), id: z.string() })),
});

export const messageDeletedPayloadSchema = z.object({
  id: z.number(),
  channelId: z.number(),
});

export const reactionUpdatedPayloadSchema = z.object({
  messageId: z.number(),
  channelId: z.number(),
  reactions: z.record(z.string(), z.array(z.string())),
});

export const memberReadPayloadSchema = z.object({
  channelId: z.number(),
  userId: z.string(),
  lastReadPosition: z.number(),
  lastReadAt: z.string(),
});

export type MessagePayload = z.infer<typeof messagePayloadSchema>;

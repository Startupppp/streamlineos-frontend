import { z } from "zod";
import { chatMessageContract } from "@/hooks/api/chat-schema/message-schema";

const messageWire = chatMessageContract.shape;

export const messagePayloadSchema = chatMessageContract
  .pick({
    id: true,
    channelId: true,
    senderId: true,
    content: true,
    replyToId: true,
    clientKey: true,
  })
  .extend({
    senderName: z.string().nullable(),
    senderImage: z.string().nullable().optional(),
    createdAt: messageWire.createdAt.nullable(),
    metadata: messageWire.metadata.optional(),
    messageType: messageWire.messageType.optional(),
    attachments: messageWire.attachments.optional(),
    idempotencyKey: z.string().optional(),
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

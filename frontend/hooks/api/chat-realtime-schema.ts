import { z } from "zod";
import type { EntityRef } from "@/types/chat";

const entityRefSchema = z.custom<EntityRef>((val) => {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  if (!("type" in val)) return false;
  return val.type === "ticket" || val.type === "comment";
});

const metadataSchema = z
  .object({
    entities: z.array(entityRefSchema).optional(),
    forwardCount: z.number().optional(),
  })
  .nullable()
  .optional();

const realtimeAttachmentSchema = z.object({
  id: z.number(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileKey: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export const messagePayloadSchema = z.object({
  id: z.number(),
  channelId: z.number(),
  senderId: z.string(),
  senderName: z.string().nullable(),
  senderImage: z.string().nullable().optional(),
  content: z.string().nullable(),
  createdAt: z.string().nullable(),
  replyToId: z.number().nullable(),
  metadata: metadataSchema,
  messageType: z.enum(["text", "lead_submission", "system"]).optional(),
  attachments: z.array(realtimeAttachmentSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const messageUpdatedPayloadSchema = z.object({
  id: z.number(),
  channelId: z.number(),
  content: z.string().nullable(),
  isEdited: z.literal(true),
  updatedAt: z.string(),
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

export const typingPayloadSchema = z.object({
  userId: z.string(),
  name: z.string(),
});

export type MessagePayload = z.infer<typeof messagePayloadSchema>;

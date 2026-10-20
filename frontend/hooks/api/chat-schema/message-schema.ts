import { z } from "zod";

const chatEntityCardContract = z.object({
  type: z.string(),
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  status: z.string().nullable(),
  href: z.string(),
});

const chatEntityRefContract = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ticket"),
    id: z.string(),
    card: chatEntityCardContract.nullable().optional(),
  }),
  z.object({
    type: z.enum([
      "task",
      "project",
      "cycle",
      "release",
      "incident",
      "client",
      "deal",
      "lead",
      "employee",
      "doc_page",
      "calendar_event",
      "support_ticket",
    ]),
    id: z.string(),
    card: chatEntityCardContract.nullable().optional(),
  }),
]);

export const chatResolvedReferencesContract = z.object({
  references: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      card: chatEntityCardContract.nullable(),
    }),
  ),
});

const chatEntityRefsContract = z.array(z.unknown()).transform((entries) =>
  entries.flatMap((entry) => {
    const parsed = chatEntityRefContract.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  }),
);

/** `metadata` is free-form jsonb; only the two keys the client reads are modelled. */
export const chatMessageMetadataContract = z
  .object({
    entities: chatEntityRefsContract.optional(),
    forwardCount: z.number().optional(),
  })
  .nullable();

export const chatMessageAttachmentContract = z.object({
  id: z.number(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileKey: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

const chatMessageSenderContract = z.object({
  id: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const chatMessageCore = {
  id: z.number(),
  channelId: z.number(),
  senderId: z.string().nullable(),
  sender: chatMessageSenderContract,
  content: z.string().nullable(),
  replyToId: z.number().nullable(),
  isEdited: z.boolean(),
  isDeleted: z.boolean(),
  messageType: z.enum(["text", "lead_submission", "system"]),
  metadata: chatMessageMetadataContract,
  actionStatus: z.string().nullable(),
  reactions: z.record(z.string(), z.array(z.string())).default({}),
  clientKey: z.string().nullable().optional(),
  channelPosition: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

const chatMessageReplyToContract = z.object({
  id: z.number(),
  content: z.string().nullable(),
  sender: chatMessageSenderContract,
});

export const chatMessageContract = z.object({
  ...chatMessageCore,
  attachments: z.array(chatMessageAttachmentContract),
  replyTo: chatMessageReplyToContract.nullable(),
});

export const chatSendResponseContract = z.object({
  id: z.number(),
  orgId: z.string(),
  channelId: z.number(),
  senderMembershipId: z.number().nullable(),
  content: z.string().nullable(),
  replyToId: z.number().nullable(),
  isEdited: z.boolean(),
  isDeleted: z.boolean(),
  messageType: z.enum(["text", "lead_submission", "system"]),
  metadata: chatMessageMetadataContract,
  actionStatus: z.string().nullable(),
  clientKey: z.string().nullable(),
  channelPosition: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChatSendResponse = z.infer<typeof chatSendResponseContract>;

export const chatMessagesPageContract = z.object({
  messages: z.array(chatMessageContract),
  nextCursor: z.number().nullable(),
});

export const chatMessageContextContract = z.object({
  messages: z.array(
    chatMessageContract.extend({
      sender: chatMessageSenderContract
        .nullable()
        .transform((sender) => sender ?? { id: null, name: null, image: null }),
    }),
  ),
  targetMessageId: z.number(),
  olderCursor: z.number().nullable(),
  hasNewer: z.boolean(),
});

export type ChatMessageContext = z.infer<typeof chatMessageContextContract>;

export const chatPollPageContract = z.object({
  messages: z.array(chatMessageContract),
  nextCursor: z.number().nullable(),
  hasMore: z.boolean(),
  latestPosition: z.number().nullable(),
});

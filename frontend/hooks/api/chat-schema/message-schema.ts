import { z } from "zod";

/**
 * The message timeline — the route behind the worst of the seven defects.
 *
 * `chat_messages` has no `sender_id` column: the identity arrives through
 * `sender_membership_id -> organization_members -> users`, and every read path
 * shipped that join verbatim as `senderMembership`. So `Message.senderId` was
 * emitted by NO read path at all. `message-list.tsx:273` computes
 * `isOwn = msg.senderId === currentUserId`, so **every message a user sent
 * rendered as somebody else's** — other-person styling, and the Edit and Delete
 * controls never appeared, both being `{isOwn && …}`. `:276` groups by
 * `prevMsg?.senderId === msg.senderId`, and `undefined === undefined` is true,
 * so consecutive messages from DIFFERENT people collapsed under one header. The
 * Ably broadcast and the optimistic insert both carried `senderId`, which is why
 * a message looked right as it was sent and flipped the instant the list
 * refetched.
 *
 * `senderId` is nullable (`sender_membership_id` is `ON DELETE SET NULL`), and
 * `sender` is the opposite: `senderFromIdentity` ALWAYS returns the three-key
 * object, with all three fields null when the identity is missing. So `sender`
 * is required-and-non-nullable while `sender.id` is nullable — the inverse of
 * every other person object in this file, and exactly the kind of asymmetry a
 * shared "user" schema would erase.
 *
 * NOT `.strict()`, unlike the channel shapes above. The timeline selects no
 * `columns:` on `chat_messages`, so the row is "every column of the table" — a
 * set that legitimately grows with a migration, not a projection somebody chose.
 * `.strict()` on an unenumerated set would turn the next column addition into an
 * outage on the highest-traffic surface in the product. The identity fields are
 * still required, which is what catches the defect.
 */

const chatEntityCardContract = z.object({
  type: z.string(),
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  status: z.string().nullable(),
  href: z.string(),
});

/**
 * Mirrors `sendMessageSchema.metadata.entities` in `chat/dto/chat.schemas.ts`,
 * which is the only writer, plus the `card` the read path resolves onto each
 * reference. `projectId` is optional on a ticket reference because
 * `chat-actions.controller.ts:63` writes one without it.
 */
const chatEntityRefContract = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ticket"),
    id: z.string(),
    card: chatEntityCardContract.nullable().optional(),
    projectId: z.number().optional(),
    ticketNumber: z.number().optional(),
    projectKey: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
  }),
  z.object({
    type: z.literal("comment"),
    id: z.string(),
    ticketId: z.number(),
    projectId: z.number(),
  }),
]);

/** `metadata` is free-form jsonb; only the two keys the client reads are modelled. */
const chatMessageMetadataContract = z
  .object({
    entities: z.array(chatEntityRefContract).optional(),
    forwardCount: z.number().optional(),
  })
  .nullable();

/**
 * `fileUrl` is in this list because it was missing from the projection and a
 * live flow read it: forwarding a message re-posts its attachments, and
 * `POST /chat/channels/:id/messages` requires `fileUrl: z.string()`. The
 * timeline selected five columns and not that one, so every forward of a
 * message with an attachment posted `fileUrl: undefined` and came back 400.
 * `MessageAttachment` declared it all along — the cast made both sides compile.
 */
export const chatMessageAttachmentContract = z
  .object({
    id: z.number(),
    fileName: z.string(),
    fileUrl: z.string(),
    fileKey: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })
  .strict();

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
  createdAt: z.string(),
  updatedAt: z.string(),
};

/**
 * `replyTo` is a PARTIAL message: the relation is requested one level deep, so
 * it carries the columns plus `senderId`/`sender` and NO `attachments` and no
 * nested `replyTo`. A schema that reused the full message here would reject
 * every reply.
 */
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

export const chatMessagesPageContract = z.object({
  messages: z.array(chatMessageContract),
  nextCursor: z.number().nullable(),
});

/** The poll route answers the same rows plus an explicit `hasMore`. */
export const chatPollPageContract = z.object({
  messages: z.array(chatMessageContract),
  nextCursor: z.number().nullable(),
  hasMore: z.boolean(),
});

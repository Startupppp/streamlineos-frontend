import { z } from "zod";

/**
 * Response contracts for the chat reads that carry a PERSON.
 *
 * Three of the seven shape-drift defects this release shipped were here, and all
 * three rendered a plausible screen rather than an error: channel members
 * arrived as `membership.user` while the client declared `user` (Favourites
 * permanently empty, channel-admin controls missing); huddle participants had
 * `columns: {}` so `userId` was never selected (every tile "Unknown",
 * `isInHuddle` permanently false); and `Message.senderId` was emitted by NO read
 * path at all, so `isOwn` was always false and a user's own messages rendered as
 * somebody else's. `apiClient.get<T>` is a cast, so both repositories typechecked
 * clean throughout.
 *
 * EVERY FIELD BELOW WAS READ OFF THE BACKEND, NOT OFF `types/chat.ts`. A contract
 * copied from the frontend's declared type encodes the drift instead of catching
 * it — it would have passed happily on all three defects. The sources are
 * `chat-channel-member-shape.ts` (`CHANNEL_MEMBER_WIRE_KEYS`,
 * `CHANNEL_MEMBER_COLUMNS`), `chat-channel-member-preview.ts`
 * (`CHANNEL_LIST_COLUMNS`, `withMemberPreview`), `chat-channel-list.service.ts`
 * and the column nullability in `db/schema/chat/chat-channel-tables.ts`.
 *
 * WHY `.strict()` HERE, AGAINST THE DEFAULT IN `api-envelope.ts`. That default
 * — an added backend field is a compatible deploy — is right for a shape nobody
 * has enumerated. These shapes ARE enumerated: the backend picks them with an
 * explicit `columns:` constant and pins the member keys in
 * `CHANNEL_MEMBER_WIRE_KEYS`, which its own spec asserts. On a closed key set an
 * unexpected key is not a compatible addition, it is the drift: every one of the
 * three defects put an EXTRA key on the wire (`membership`, `senderMembership`)
 * beside the missing one. Required-and-nullable already rejects the missing
 * half; `.strict()` is what names the extra half in the error, which is the
 * difference between a five-minute diagnosis and a five-day one.
 *
 * DATES ARE STRINGS. `types/chat.ts` declares `Date | string | null` because the
 * optimistic-insert paths construct real `Date`s. Nothing on the WIRE is ever a
 * `Date` — Nest serialises a Drizzle `timestamp` to an ISO string — so the
 * contract says `string`, and a `.notNull()` column says non-nullable.
 *
 * ENUMS. `type`, `role` and `notificationPreference` have no CHECK constraint,
 * so the enums here rest on two measurements: every write goes through a Zod
 * literal/enum DTO (`chat.schemas.ts` `createChannelSchema`,
 * `notificationPreferenceSchema`; `role` is written only as "ADMIN"/"MEMBER"),
 * and `scratch_perf_seed` at head holds only the declared values
 * (type PUBLIC/GROUP, role MEMBER, notification_preference DEFAULT). An
 * undeclared value arriving is drift the screen cannot render anyway.
 */

/**
 * THREE different person sub-objects ship from this module, and they are not
 * interchangeable. The bounded channel-list preview builds `{id, name, image}`
 * by hand (`chat-channel-member-preview.ts`); the members and channel-detail
 * routes select `{id, name, image, email}` via `CHANNEL_MEMBER_MEMBERSHIP_WITH`,
 * where `users.email` is `.notNull()`; the huddle participant selects
 * `{id, name, image}` and the huddle host only `{id, name}`. One shared object
 * would have to be loose enough to accept all four, which is how a contract
 * stops catching anything.
 */
export const chatPreviewUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  })
  .strict();

export const chatMemberUserContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string(),
  })
  .strict();

/**
 * `userId` and `user` are nullable — not optional. A member whose
 * `organization_members` row is gone flattens to nulls rather than to missing
 * keys, and that distinction is the whole defect: the broken payload had no
 * `user` key at all, which a required-nullable field rejects and an optional one
 * would have waved through.
 *
 * The nine columns are `CHANNEL_MEMBER_COLUMNS` verbatim. `orgId` and
 * `membershipId` are absent on purpose — the caller's tenant is already the only
 * one it can read, and the membership id is an internal join key.
 */
const channelMemberBase = {
  id: z.number(),
  channelId: z.number(),
  userId: z.string().nullable(),
  role: z.enum(["ADMIN", "MEMBER"]),
  lastReadAt: z.string(),
  joinedAt: z.string(),
  mutedUntil: z.string().nullable(),
  archivedAt: z.string().nullable(),
  isFavorite: z.boolean(),
  notificationPreference: z.enum(["DEFAULT", "ALL", "MENTIONS", "NOTHING"]),
};

/** The channel-list preview row: the same nine columns, `user` without `email`. */
export const chatChannelMemberPreviewContract = z
  .object({ ...channelMemberBase, user: chatPreviewUserContract.nullable() })
  .strict();

/** The members and channel-detail rows: `user` carries the address as well. */
export const chatChannelMemberContract = z
  .object({ ...channelMemberBase, user: chatMemberUserContract.nullable() })
  .strict();

export const chatLastMessageContract = z
  .object({
    content: z.string().nullable(),
    senderName: z.string().nullable(),
    createdAt: z.string(),
  })
  .strict();

/**
 * A channel list row is `CHANNEL_LIST_COLUMNS` plus exactly four computed keys.
 *
 * `createdBy` is NOT among them, and never was: `chat_channels` has no
 * `created_by` column — only `created_by_membership_id`, which
 * `CHANNEL_LIST_COLUMNS` deliberately omits. `types/chat.ts` declared
 * `createdBy: string` regardless, and no component ever read it. That is an
 * eighth instance of the same class, found by writing this contract; the field
 * is removed rather than declared here, because declaring it would make the
 * contract satisfiable and false at the same time.
 */
export const chatChannelContract = z
  .object({
    id: z.number(),
    orgId: z.string(),
    name: z.string(),
    type: z.enum(["DIRECT", "GROUP", "PUBLIC", "PRIVATE"]),
    description: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    isArchived: z.boolean(),
    isPrivate: z.boolean(),
    entityType: z.string().nullable(),
    entityId: z.string().nullable(),
    lastMessageAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    members: z.array(chatChannelMemberPreviewContract),
    memberCount: z.number(),
    membersTruncated: z.boolean(),
    unreadCount: z.number(),
    lastMessage: chatLastMessageContract.nullable(),
  })
  .strict();

/**
 * `listPublicChannels` builds its row with an explicit `db.select({...})` of
 * seven columns and adds `memberCount` and `isMember`. It carries no members
 * array and no unread count.
 */
export const chatPublicChannelContract = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    type: z.enum(["DIRECT", "GROUP", "PUBLIC", "PRIVATE"]),
    createdAt: z.string(),
    lastMessageAt: z.string(),
    memberCount: z.number(),
    isMember: z.boolean(),
  })
  .strict();

/**
 * The keyset page every channel list route answers.
 *
 * Left non-`.strict()`: the page envelope is the one place a future field
 * (`total`, `hasMore`) is a genuinely compatible addition, and it carries no
 * identity of its own.
 */
export function chatChannelPageContract<T extends z.ZodTypeAny>(row: T) {
  return z.object({
    channels: z.array(row),
    nextCursor: z.string().nullable(),
  });
}

/**
 * The huddle.
 *
 * `HUDDLE_WIRE_KEYS` and `HUDDLE_PARTICIPANT_WIRE_KEYS` in
 * `chat-huddles.service.ts` pin both key sets and a backend spec asserts them,
 * so `.strict()` here is checked on both sides of the wire.
 *
 * `userId` is NULLABLE, and that is the defect in one line. The read path
 * carried `membership` with `columns: {}` — an empty selection selects nothing —
 * so `userId` was never on the payload at all, every tile read "Unknown",
 * `isInHuddle` was permanently false and the WebRTC mesh had no peer ids to dial.
 * A required-and-nullable field rejects a MISSING key; an optional one would
 * have waved the whole defect through.
 *
 * `startedBy` is the host's USER id, not a membership id — a distinction no
 * static check can make, which is why it is written down here.
 */
export const chatHuddleParticipantContract = z
  .object({
    id: z.number(),
    huddleId: z.number(),
    joinedAt: z.string(),
    leftAt: z.string().nullable(),
    isMuted: z.boolean(),
    handRaised: z.boolean(),
    isScreenSharing: z.boolean(),
    userId: z.string().nullable(),
    user: chatPreviewUserContract.nullable(),
  })
  .strict();

export const chatHuddleContract = z
  .object({
    id: z.number(),
    channelId: z.number(),
    status: z.enum(["active", "ended"]),
    calendarEventId: z.number().nullable(),
    startedAt: z.string(),
    endedAt: z.string().nullable(),
    startedBy: z.string().nullable(),
    startedByUser: z.object({ id: z.string(), name: z.string().nullable() }).strict().nullable(),
    participants: z.array(chatHuddleParticipantContract),
  })
  .strict();

/** No active huddle is a 200 with a `null` body, not a 404. */
export const chatActiveHuddleContract = chatHuddleContract.nullable();

export type ChatChannelWire = z.infer<typeof chatChannelContract>;
export type ChatChannelMemberWire = z.infer<typeof chatChannelMemberContract>;
export type ChatPublicChannelWire = z.infer<typeof chatPublicChannelContract>;
export type ChatHuddleWire = z.infer<typeof chatHuddleContract>;

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
const chatMessageAttachmentContract = z
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

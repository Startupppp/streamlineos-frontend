
/**
 * Resolved for the reader at read time. A null card means the record is gone,
 * or the reader may not see it — the two are deliberately indistinguishable.
 */
export interface EntityCard {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  href: string;
}

export interface TicketEntityRef {
  type: "ticket";
  id: string;
  card?: EntityCard | null;
  projectId?: number;
  ticketNumber?: number;
  projectKey?: string;
  title?: string;
  status?: string;
  priority?: string;
}

export interface CommentEntityRef {
  type: "comment";
  id: string;
  ticketId: number;
  projectId: number;
}

export type EntityRef = TicketEntityRef | CommentEntityRef;

export interface MessageMetadata {
  entities?: EntityRef[];
  forwardCount?: number;
}

export type ChannelType = "DIRECT" | "GROUP" | "PUBLIC" | "PRIVATE";

export type ChannelMemberRole = "ADMIN" | "MEMBER";

export type MessageType = "text" | "lead_submission" | "system";

export type PresenceStatus = "ONLINE" | "AWAY" | "OFFLINE";

export type ChatNotificationPreference = "DEFAULT" | "ALL" | "MENTIONS" | "NOTHING";

/**
 * Mirrors the backend's one member wire shape (`chat-channel-member-shape.ts`), which the detail
 * route, the paginated member list, the entity-channel read and the bounded channel-list preview
 * all emit. Until 2026-09-03 those shipped the identity nested as `membership.user`, this interface
 * declared it flat, and `apiClient.get<Channel>` cast the difference away — so `user` was undefined
 * on every member and every DIRECT header read "Unknown".
 *
 * `userId` is nullable because a member whose organization row is gone flattens to nulls rather
 * than to missing keys. `email` is absent from the list preview and present on the detail route.
 */
export interface ChannelMember {
  id: number;
  channelId: number;
  userId: string | null;
  role: ChannelMemberRole;
  lastReadAt?: Date | string | null;
  joinedAt?: Date | string | null;
  mutedUntil: Date | string | null;
  archivedAt?: Date | string | null;
  isFavorite: boolean;
  notificationPreference: ChatNotificationPreference;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string | null;
  } | null;
}

export interface LastMessage {
  content: string | null;
  senderName: string | null;
  createdAt: Date | string | null;
}

/**
 * `createdBy` was declared here and emitted by NO read path: `chat_channels` has
 * no `created_by` column, only `created_by_membership_id`, which the list
 * projection deliberately omits. Nothing read it, so it never showed — the same
 * class as the three chat defects, caught by writing `chatChannelContract`.
 */
export interface Channel {
  id: number;
  orgId?: string;
  name: string;
  type: ChannelType;
  description?: string | null;
  avatarUrl: string | null;
  isArchived: boolean;
  isPrivate?: boolean;
  entityType: string | null;
  entityId: string | null;
  lastMessageAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  members: ChannelMember[];
  /** List rows only: the TRUE roster size, which `members.length` is a bounded preview of. */
  memberCount?: number;
  membersTruncated?: boolean;
  unreadCount: number;
  lastMessage: LastMessage | null;
}

export interface PublicChannel {
  id: number;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  type: ChannelType;
  memberCount: number;
  isMember: boolean;
  createdAt: Date | string | null;
  lastMessageAt: Date | string | null;
}

/**
 * The six keys the timeline projects. `messageId` and `createdAt` were declared
 * and never emitted by that read path; `fileUrl` was declared, never emitted, and
 * READ — forwarding a message re-posts its attachments and the send DTO requires
 * `fileUrl`, so every forward of a message with an attachment came back 400.
 * `fileUrl` is now in the projection; the two nobody reads are gone.
 */
export interface MessageAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
}

export interface MessageReplyTo {
  id: number;
  content: string | null;
  sender: { id: string | null; name: string | null; image: string | null };
}

/**
 * `senderId` is NULLABLE — `sender_membership_id` is `ON DELETE SET NULL` — and
 * `sender` is the opposite: the read path always builds the object, with all
 * three fields null when the identity is gone. Declared the other way round,
 * these were the half of the `isOwn` defect a typecheck could not see.
 */
export interface Message {
  id: number;
  channelId: number;
  senderId: string | null;
  content: string | null;
  replyToId: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  messageType: MessageType;
  metadata: MessageMetadata | null;
  actionStatus: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  sender: { id: string | null; name: string | null; image: string | null };
  attachments: MessageAttachment[];
  replyTo: MessageReplyTo | null;
  reactions?: Record<string, string[]>;
}

export interface TypingIndicator {
  userId: string;
  name: string;
}

export interface OnlineUser {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: Date | string | null;
  userName: string | null;
  userImage: string | null;
}

export interface OrgUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
}

export interface MessagesPage {
  messages: Message[];
  nextCursor: number | null;
}

export interface ChannelsPage {
  channels: Channel[];
  nextCursor: string | null;
}

export interface PublicChannelsPage {
  channels: PublicChannel[];
  nextCursor: string | null;
}

export interface CreateDMInput {
  targetUserId: string;
}

export interface CreateGroupChannelInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  memberIds: string[];
}

export interface CreatePublicChannelInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  memberIds: string[];
}

export interface CreatePrivateChannelInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  memberIds: string[];
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface AttachmentInput {
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
}

export interface SendMessageInput {
  mentionedUserIds?: string[];
  channelId: number;
  content?: string;
  replyToId?: number;
  attachments?: AttachmentInput[];
  metadata?: MessageMetadata;
  /**
   * Per-logical-send idempotency key, matching `clientKey` in the backend's
   * `chat.schemas.ts`. The send path pre-checks it, arbitrates on the partial
   * unique index `uniq_chat_messages_client_key` and replays the winner of a
   * race — but only when the client actually sends one. Minted by
   * `use-message-composer.ts` and held stable while the draft is unchanged, so a
   * send re-issued after a timeout replays instead of inserting a second row.
   */
  clientKey?: string;
}

export interface EditMessageInput {
  messageId: number;
  content: string;
}

export interface ThreadPage {
  parentMessage: Message;
  replies: Message[];
  nextCursor?: number;
}

export interface PinnedMessage {
  id: number;
  channelId: number;
  messageId: number;
  pinnedBy: string;
  pinnedAt: Date | string;
  message: Message & { sender: { id: string; name: string | null; image: string | null } | null };
  pinnedByUser: { id: string; name: string | null } | null;
}

/**
 * `userId` and `startedBy` are NULLABLE, and the backend has always emitted them
 * that way: `flattenChannelMember` and `loadHuddleWire` both resolve a missing
 * `organization_members` row to `null`. Declared non-nullable here, they were the
 * half of the huddle defect a typecheck could not see.
 */
export interface HuddleParticipant {
  id: number;
  huddleId: number;
  userId: string | null;
  joinedAt: Date | string;
  leftAt: Date | string | null;
  isMuted: boolean;
  handRaised: boolean;
  isScreenSharing: boolean;
  user?: { id: string; name: string | null; image: string | null } | null;
}

export interface Huddle {
  id: number;
  channelId: number;
  startedBy: string | null;
  status: "active" | "ended";
  calendarEventId: number | null;
  startedAt: Date | string;
  endedAt: Date | string | null;
  participants: HuddleParticipant[];
  startedByUser?: { id: string; name: string | null } | null;
}

export interface HuddleSignalInput {
  type: "offer" | "answer" | "ice-candidate";
  targetUserId: string;
  payload: unknown;
}

export interface SearchMessagesResult {
  results: (Message & { channel?: { id: number; name: string | null; type: string } | null })[];
  nextCursor?: number;
}

export interface SavedMessage {
  id: number;
  userId: string;
  messageId: number;
  savedAt: string | Date;
  message: Message & { channel?: { id: number; name: string | null; type: string } | null };
}

export interface SavedMessagesPage {
  items: SavedMessage[];
  nextCursor?: number;
}

export interface SearchChannelResult {
  id: number;
  name: string | null;
  type: string;
  description: string | null;
  avatarUrl: string | null;
  isMember: boolean;
}

export interface SearchUserResult {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

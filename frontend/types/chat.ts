
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
  /** Snapshot fields on messages sent before references resolved at read time. */
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

export interface ChannelMember {
  id: number;
  channelId: number;
  userId: string;
  role: ChannelMemberRole;
  lastReadAt: Date | string | null;
  joinedAt: Date | string | null;
  mutedUntil: Date | string | null;
  archivedAt?: Date | string | null;
  isFavorite: boolean;
  notificationPreference: ChatNotificationPreference;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

export interface LastMessage {
  content: string | null;
  senderName: string | null;
  createdAt: Date | string | null;
}

export interface Channel {
  id: number;
  orgId: string;
  name: string;
  type: ChannelType;
  description: string | null;
  avatarUrl: string | null;
  createdBy: string;
  isArchived: boolean;
  isPrivate: boolean;
  entityType: string | null;
  entityId: string | null;
  lastMessageAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  members: ChannelMember[];
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

export interface MessageAttachment {
  id: number;
  messageId: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date | string | null;
}

export interface MessageReplyTo {
  id: number;
  content: string | null;
  sender: { id: string; name: string | null } | null;
}

export interface Message {
  id: number;
  channelId: number;
  senderId: string;
  content: string | null;
  replyToId: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  messageType: MessageType;
  metadata: MessageMetadata | null;
  actionStatus: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  sender: { id: string; name: string | null; image: string | null } | null;
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
  nextCursor?: number;
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
  channelId: number;
  content?: string;
  replyToId?: number;
  attachments?: AttachmentInput[];
  metadata?: MessageMetadata;
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

export interface HuddleParticipant {
  id: number;
  huddleId: number;
  userId: string;
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
  startedBy: string;
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

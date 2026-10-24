import type { z } from "zod";
import type {
  ChatChannelMemberWire,
  chatChannelContract,
  chatChannelMemberPreviewContract,
  chatHuddleContract,
  chatMessageContract,
  chatMessagesPageContract,
  chatNotifPrefResponseContract,
  chatOrgUsersContract,
  chatPinItemContract,
  chatPublicChannelContract,
  chatSavedMessagesContract,
  chatSearchChannelsContract,
  chatSearchMessagesContract,
  chatSearchUsersContract,
  chatThreadPageContract,
} from "@/hooks/api/chat-schema";
import type { chatMessageAttachmentContract } from "@/hooks/api/chat-schema/message-schema";

export type Message = z.infer<typeof chatMessageContract>;
export type MessagesPage = z.infer<typeof chatMessagesPageContract>;
export type ThreadPage = z.infer<typeof chatThreadPageContract>;

export type MessageMetadata = NonNullable<Message["metadata"]>;
export type EntityRef = NonNullable<MessageMetadata["entities"]>[number];
export type EntityCard = NonNullable<EntityRef["card"]>;
export type TicketEntityRef = Extract<EntityRef, { type: "ticket" }>;

type ChannelMemberPreviewWire = z.infer<
  typeof chatChannelMemberPreviewContract
>;

export type ChannelMember = Omit<ChannelMemberPreviewWire, "user"> &
  Partial<
    Pick<ChatChannelMemberWire, "lastReadAt" | "joinedAt" | "archivedAt">
  > & {
    user:
      | (NonNullable<ChannelMemberPreviewWire["user"]> &
          Partial<Pick<NonNullable<ChatChannelMemberWire["user"]>, "email">>)
      | null;
  };

export type Channel = z.infer<typeof chatChannelContract>;
export type PublicChannel = z.infer<typeof chatPublicChannelContract>;

export interface ChannelPage<TChannel> {
  channels: TChannel[];
  nextCursor: string | null;
}

export type ChatNotificationPreference = z.infer<
  typeof chatNotifPrefResponseContract
>["notificationPreference"];

export type OrgUser = z.infer<typeof chatOrgUsersContract>[number];

export type PinnedMessage = z.infer<typeof chatPinItemContract>;

export type Huddle = z.infer<typeof chatHuddleContract>;
export type HuddleParticipant = Huddle["participants"][number];

export type SearchMessagesResult = z.infer<typeof chatSearchMessagesContract>;
export type SearchChannelResult = z.infer<
  typeof chatSearchChannelsContract
>[number];
export type SearchUserResult = z.infer<typeof chatSearchUsersContract>[number];

export type SavedMessagesPage = z.infer<typeof chatSavedMessagesContract>;
export type SavedMessage = SavedMessagesPage["items"][number];

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

export type AttachmentInput = Omit<z.infer<typeof chatMessageAttachmentContract>, "id">;

export interface SendMessageInput {
  mentionedUserIds?: string[];
  channelId: number;
  content?: string;
  replyToId?: number;
  attachments?: AttachmentInput[];
  metadata?: MessageMetadata;
  clientKey: string;
}

export interface EditMessageInput {
  messageId: number;
  content: string;
}

import type { useChatChannels } from "@/hooks/api/chat-core-read";
import type { TicketEntityRef, CommentEntityRef, MessageMetadata } from "@/types/chat";
export type { TicketEntityRef, CommentEntityRef, MessageMetadata };

type ChannelRaw = ReturnType<typeof useChatChannels>["channels"][number];
export type Channel = Omit<ChannelRaw, "lastMessage"> & {
  lastMessage?: {
    content?: string | null;
    senderName?: string | null;
    createdAt?: Date | string | null;
  } | null;
};
export type { Message } from "@/types/chat";

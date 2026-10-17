import type { ChannelMember, Message } from "@/types/chat";
import { findOwnMember } from "./channel-member-lookup";

export function resolveFirstUnreadIndex(
  messages: Message[],
  members: ChannelMember[] | undefined,
  currentUserId: string,
): number {
  const lastReadAt = findOwnMember(members, currentUserId)?.lastReadAt;
  if (!lastReadAt) return -1;
  const lastReadTime = new Date(lastReadAt).getTime();
  return messages.findIndex(
    (message) =>
      message.createdAt !== null &&
      message.createdAt !== undefined &&
      new Date(message.createdAt).getTime() > lastReadTime,
  );
}

export function chatChannelReadEnabled(
  canRead: boolean,
  channelId: number,
): boolean {
  return canRead && channelId > 0;
}

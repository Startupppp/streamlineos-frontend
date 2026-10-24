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

export type PeerRead = { userId: string; lastReadPosition: number; lastReadAt: string };

export function resolveReadReceipt(
  message: Pick<Message, "channelPosition" | "createdAt">,
  peerReads: readonly PeerRead[] | undefined,
  channelType: string | undefined,
): string {
  if (!peerReads || peerReads.length === 0) return "Delivered";
  const position = message.channelPosition;
  const sentAt = message.createdAt ? Date.parse(message.createdAt) : Number.NaN;
  const seen = peerReads.filter((peer) =>
    position !== undefined
      ? peer.lastReadPosition >= position
      : !Number.isNaN(sentAt) && Date.parse(peer.lastReadAt) >= sentAt,
  ).length;
  if (seen === 0) return "Delivered";
  return channelType === "DIRECT" ? "Seen" : `Seen by ${seen}`;
}

export function chatChannelReadEnabled(
  canRead: boolean,
  channelId: number,
): boolean {
  return canRead && channelId > 0;
}

import type { ChannelMember } from "@/types/chat";

export function resolveDirectPartner(
  members: ChannelMember[] | undefined,
  currentUserId: string,
): ChannelMember["user"] {
  if (!members || members.length === 0) return null;
  const partner = members.find(
    (member) => member.user && member.user.id !== currentUserId,
  );
  if (partner) return partner.user;
  const [only] = members;
  return members.length === 1 && only?.user?.id === currentUserId
    ? only.user
    : null;
}

/** The caller's own row: it carries `isFavorite`, `role`, `lastReadAt` and the mute state. */
export function findOwnMember(
  members: ChannelMember[] | undefined,
  currentUserId: string,
): ChannelMember | undefined {
  return members?.find((member) => member.user?.id === currentUserId);
}

export function conversationConfirmName(
  channel:
    | { type: string; name?: string | null; members?: ChannelMember[] }
    | null
    | undefined,
  currentUserId: string,
): string {
  if (!channel) return "this conversation";
  if (channel.type === "DIRECT") {
    return (
      resolveDirectPartner(channel.members, currentUserId)?.name ?? "Unknown"
    );
  }
  return channel.name ? `#${channel.name}` : "this channel";
}

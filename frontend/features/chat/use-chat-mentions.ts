import { useMemo } from "react";
import type { Channel, OrgUser } from "@/types/chat";
import { resolveDirectPartner } from "./channel-member-lookup";

type ChatMentionsInput = {
  orgUsers: OrgUser[] | undefined;
  channel: Channel | undefined;
  currentUserId: string;
  query: string;
};

export function useChatMentions({
  orgUsers,
  channel,
  currentUserId,
  query,
}: ChatMentionsInput) {
  const candidates = useMemo(() => {
    if (!orgUsers) return [];
    if (channel?.type === "DIRECT") {
      const otherId = resolveDirectPartner(channel.members, currentUserId)?.id;
      return orgUsers.filter((user) => user.id === otherId);
    }
    return orgUsers.filter((user) => user.id !== currentUserId);
  }, [orgUsers, channel, currentUserId]);

  const filtered = useMemo(() => {
    if (!query) return candidates;
    const normalizedQuery = query.toLowerCase();
    return candidates.filter((user) => user.name?.toLowerCase().includes(normalizedQuery));
  }, [candidates, query]);

  return { candidates, filtered };
}

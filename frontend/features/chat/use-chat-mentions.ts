import { useMemo } from "react";
import type { Channel, OrgUser } from "@/types/chat";

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
      const otherId = channel.members?.find((member) => member.user?.id !== currentUserId)?.user?.id;
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

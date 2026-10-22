import { useMemo } from "react";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import { useSearchUsers } from "@/hooks/api/chat-search";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

export interface MentionCandidate {
  id: string;
  name: string | null;
  image: string | null;
  isMember: boolean;
}

const MENTION_LIMIT = 8;

function matches(query: string, name: string | null, email: string): boolean {
  if (!query) return true;
  return Boolean(name?.toLowerCase().includes(query)) || email.toLowerCase().includes(query);
}

interface ChatMentionsInput {
  channel: ChatChannelDetailWire | undefined;
  currentUserId: string;
  query: string;
  enabled: boolean;
}

export function useChatMentions({ channel, currentUserId, query, enabled }: ChatMentionsInput) {
  const isDirect = channel?.type === "DIRECT";
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: found } = useSearchUsers(debouncedQuery, enabled && !isDirect);

  const members = useMemo(
    () =>
      (channel?.members ?? []).flatMap((member) =>
        member.user && member.user.id !== currentUserId ? [member.user] : [],
      ),
    [channel, currentUserId],
  );

  return useMemo<MentionCandidate[]>(() => {
    const normalized = query.toLowerCase();
    const memberIds = new Set(members.map((member) => member.id));
    const fromMembers = members
      .filter((member) => matches(normalized, member.name, member.email))
      .map((member) => ({ id: member.id, name: member.name, image: member.image, isMember: true }));
    const fromOrg = isDirect
      ? []
      : (found ?? [])
          .filter(
            (user) =>
              user.id !== currentUserId &&
              !memberIds.has(user.id) &&
              matches(normalized, user.name, user.email),
          )
          .map((user) => ({ id: user.id, name: user.name, image: user.image, isMember: false }));
    return [...fromMembers, ...fromOrg].slice(0, MENTION_LIMIT);
  }, [members, found, query, currentUserId, isDirect]);
}

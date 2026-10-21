"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  cancelChatMessageQueries,
  findCachedMessage,
  patchChatMessage,
  type ChatCacheRollback,
} from "@/hooks/api/chat-message-cache";
import {
  beginReaction,
  enqueueReaction,
  isLatestReaction,
  reactionKey,
  settleReaction,
} from "@/hooks/api/chat-send-policy";

const chatReactionsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatReactionsContract),
);

interface RollbackContext {
  rollback: ChatCacheRollback;
}

type ReactionsResponse = { reactions: Record<string, string[]> };

const reactionRemovals = new WeakMap<object, boolean>();
export function useToggleReaction(channelId: number) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const viewerReacted = (messageId: number, emoji: string) =>
    userId !== undefined &&
    (findCachedMessage(queryClient, channelId, messageId)?.reactions[
      emoji
    ]?.includes(userId) ??
      false);
  return useAuthorizedMutation<
    ReactionsResponse,
    Error,
    { messageId: number; emoji: string },
    RollbackContext
  >("chat:messages:write", {
    mutationKey: ["chat", "messages", "toggle-reaction"],
    mutationFn: (variables) => {
      const { messageId, emoji } = variables;
      const remove =
        reactionRemovals.get(variables) ?? viewerReacted(messageId, emoji);
      return enqueueReaction(reactionKey(channelId, messageId, emoji), () =>
        remove
          ? apiClient.delete<ReactionsResponse>(
              `/chat/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
              undefined,
              undefined,
              chatReactionsContract,
            )
          : apiClient.post<ReactionsResponse>(
              `/chat/channels/${channelId}/messages/${messageId}/reactions`,
              { emoji },
              undefined,
              chatReactionsContract,
            ),
      );
    },
    onMutate: async (variables) => {
      const { messageId, emoji } = variables;
      beginReaction(reactionKey(channelId, messageId, emoji));
      const remove = viewerReacted(messageId, emoji);
      reactionRemovals.set(variables, remove);
      await cancelChatMessageQueries(queryClient, channelId);
      const current = findCachedMessage(queryClient, channelId, messageId);
      if (!current || userId === undefined)
        return { rollback: () => undefined };
      const users = current.reactions[emoji] ?? [];
      const nextUsers = remove
        ? users.filter((id) => id !== userId)
        : [...users, userId];
      const reactions = Object.fromEntries(
        Object.entries({ ...current.reactions, [emoji]: nextUsers }).filter(
          ([, ids]) => ids.length > 0,
        ),
      );
      return {
        rollback: patchChatMessage(queryClient, channelId, messageId, {
          reactions,
        }),
      };
    },
    onError: (_error, { messageId, emoji }, context) => {
      if (isLatestReaction(reactionKey(channelId, messageId, emoji)))
        context?.rollback();
    },
    onSuccess: ({ reactions }, { messageId, emoji }) => {
      if (isLatestReaction(reactionKey(channelId, messageId, emoji)))
        patchChatMessage(queryClient, channelId, messageId, { reactions });
    },
    onSettled: (_data, _error, { messageId, emoji }) => {
      settleReaction(reactionKey(channelId, messageId, emoji));
    },
  });
}

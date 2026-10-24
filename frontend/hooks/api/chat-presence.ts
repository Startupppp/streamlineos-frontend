"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { ChatOnlineUser } from "@/hooks/api/chat-schema/presence-schema";
import type { PresenceClearAfter, PresenceStatus } from "@/lib/presence";
import { cancelLoadedQueries } from "@/hooks/api/chat-message-cache";
import { markStale } from "@/hooks/api/chat-channel-rows";

const chatOkContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOkContract),
);

interface RollbackContext {
  rollback: () => void;
}

export function useChatHeartbeat() {
  return useAuthorizedMutation("chat:messages:read", {
    mutationKey: ["chat", "presence", "heartbeat"],
    mutationFn: () =>
      apiClient.post<{ ok: boolean }>("/chat/presence/heartbeat", undefined, undefined, chatOkContract),
  });
}

export interface SetPresenceStatusInput {
  status: PresenceStatus;
  statusMessage?: string;
  clearAfter?: PresenceClearAfter;
}

export function useSetPresenceStatus() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const onlineKey = collaborationQueryKeys.chat.onlineUsers();
  return useAuthorizedMutation<{ ok: boolean }, Error, SetPresenceStatusInput, RollbackContext>(
    "chat:messages:read",
    {
      mutationKey: ["chat", "presence", "set-status"],
      mutationFn: (input) => apiClient.put<{ ok: boolean }>("/chat/status", input, undefined, chatOkContract),
      onMutate: async ({ status, statusMessage }) => {
        await cancelLoadedQueries(queryClient, [onlineKey]);
        const previous = queryClient.getQueryData<ChatOnlineUser[]>(onlineKey);
        if (!previous || !userId) return { rollback: () => undefined };
        const next = previous.map((user) =>
          user.userId === userId ? { ...user, status, statusMessage: statusMessage ?? null } : user,
        );
        const stored = queryClient.setQueryData<ChatOnlineUser[]>(onlineKey, next);
        return {
          rollback: () =>
            queryClient.setQueryData<ChatOnlineUser[]>(onlineKey, (current) => (current === stored ? previous : current)),
        };
      },
      onError: (_error, _input, context) => context?.rollback(),
      onSuccess: () => markStale(queryClient, onlineKey),
    },
  );
}

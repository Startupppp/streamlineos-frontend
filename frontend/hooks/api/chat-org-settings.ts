"use client";

import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { ChatOrgSettingsWire } from "@/hooks/api/chat-schema/channel-settings-schema";

const chatOrgSettingsContract = lazyContract(() =>
  import("@/hooks/api/chat-schema").then((m) => m.chatOrgSettingsContract),
);

export type ChatOrgSettings = ChatOrgSettingsWire;

export interface UpdateChatOrgSettingsInput {
  defaultNotificationPreference?: ChatOrgSettings["defaultNotificationPreference"];
  maxAttachmentSizeMb?: number;
  maxHuddleParticipants?: number;
}

export function useChatOrgSettings(
  options?: Omit<UseQueryOptions<ChatOrgSettings, Error>, "queryKey" | "queryFn">,
) {
  const canRead = useCan("chat:channels:read");
  return useQuery<ChatOrgSettings, Error>({
    queryKey: collaborationQueryKeys.chat.orgSettings(),
    queryFn: ({ signal }) =>
      apiClient.get<ChatOrgSettings>("/chat/settings", undefined, signal, chatOrgSettingsContract),
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useUpdateChatOrgSettings() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ChatOrgSettings, Error, UpdateChatOrgSettingsInput>(
    "chat:org-settings:manage",
    {
      mutationKey: ["chat", "orgSettings", "update"],
      mutationFn: (input) =>
        apiClient.patch<ChatOrgSettings>("/chat/settings", input, undefined, chatOrgSettingsContract),
      onSuccess: (settings) => {
        queryClient.setQueryData(collaborationQueryKeys.chat.orgSettings(), settings);
        queryClient.invalidateQueries({ queryKey: collaborationQueryKeys.chat.orgSettings() });
      },
    },
  );
}

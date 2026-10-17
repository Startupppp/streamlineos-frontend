"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { getErrorMessage } from "@/lib/get-error-message";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { ChatOrgSettings } from "@/hooks/api/chat-schema/channel-settings-schema";

const chatOrgSettingsC = lazyContract(() =>
  import("@/hooks/api/chat-schema/channel-settings-schema").then((m) => m.chatOrgSettingsContract),
);

/** Org-wide chat defaults. Readable by any chat reader; the settings page itself is admin-only. */
export function useChatOrgSettings() {
  const canRead = useCan("chat:channels:read");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: collaborationQueryKeys.chat.orgSettings(),
    queryFn: ({ signal }) => apiClient.get<ChatOrgSettings>("/chat/settings", undefined, signal, chatOrgSettingsC),
    staleTime: 5 * 60_000,
    enabled: canRead,
  });
}

type UpdateChatOrgSettingsInput = Partial<Omit<ChatOrgSettings, "orgId">>;

export function useUpdateChatOrgSettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ChatOrgSettings, Error, UpdateChatOrgSettingsInput>("chat:org-settings:manage", {
    mutationKey: ["chat", "orgSettings", "update"],
    mutationFn: (input) => apiClient.patch<ChatOrgSettings>("/chat/settings", input, undefined, chatOrgSettingsC),
    onSuccess: (settings) => {
      qc.setQueryData(collaborationQueryKeys.chat.orgSettings(), settings);
      toast.success("Chat settings saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

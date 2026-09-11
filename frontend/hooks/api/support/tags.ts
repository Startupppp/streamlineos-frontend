"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const supportTagListContract = lazyContract(() =>
  import("@/hooks/api/support/support-workspace-schema").then((m) => m.supportTagListContract),
);
const supportWorkspaceSuccessContract = lazyContract(() =>
  import("@/hooks/api/support/support-workspace-schema").then((m) => m.supportWorkspaceSuccessContract),
);

export interface SupportTag {
  id: number;
  orgId: string;
  name: string;
  color: string | null;
  createdAt: string | null;
}

export function useSupportTags() {
  return useGatedQuery("support:tickets:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportTags.list(),
    queryFn: ({ signal }) => apiClient.get<SupportTag[]>("/support/tags", undefined, signal, supportTagListContract),
    staleTime: 60_000,
  });
}

export function useTicketTags(ticketId: number) {
  return useGatedQuery("support:tickets:view", {
    queryKey: [...platformCoreQueryKeys.support.detail(ticketId), "tags"] as const,
    queryFn: ({ signal }) => apiClient.get<SupportTag[]>(`/support/${ticketId}/tags`, undefined, signal, supportTagListContract),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useAttachTag() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["attach", "tag"],
    mutationFn: ({ ticketId, tagId }: { ticketId: number; tagId: number }) =>
      apiClient.post<{ success: boolean }>(`/support/${ticketId}/tags/${tagId}`, {}, undefined, supportWorkspaceSuccessContract),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(vars.ticketId) }),
  });
}

export function useDetachTag() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["detach", "tag"],
    mutationFn: ({ ticketId, tagId }: { ticketId: number; tagId: number }) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/tags/${tagId}`, undefined, undefined, supportWorkspaceSuccessContract),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(vars.ticketId) }),
  });
}

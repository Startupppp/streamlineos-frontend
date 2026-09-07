"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { supportTicketWatchersContract } from "@/hooks/api/watchers-schema";

const watcherSuccessContract = lazyContract(() =>
  import("@/hooks/api/support/support-workspace-schema").then((m) => m.supportWorkspaceSuccessContract),
);

export interface SupportTicketWatcher {
  id: number;
  orgId: string;
  ticketId: number;
  userId: string | null;
  createdAt: string | null;
  user: { id: string; name: string | null; image: string | null } | null;
}

export function useSupportWatchers(ticketId: number) {
  return useGatedQuery("support:tickets:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportWatchers.list(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<SupportTicketWatcher[]>(
        `/support/${ticketId}/watchers`,
        undefined,
        signal,
        supportTicketWatchersContract,
      ),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useFollowTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:view", {
    mutationKey: ["follow", "ticket"],
    mutationFn: (ticketId: number) => apiClient.post<{ success: boolean }>(`/support/${ticketId}/follow`, {}, undefined, watcherSuccessContract),
    onSuccess: (_, ticketId) =>
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportWatchers.list(ticketId) }),
  });
}

export function useUnfollowTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:view", {
    mutationKey: ["unfollow", "ticket"],
    mutationFn: (ticketId: number) => apiClient.delete<{ success: boolean }>(`/support/${ticketId}/follow`, undefined, undefined, watcherSuccessContract),
    onSuccess: (_, ticketId) =>
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportWatchers.list(ticketId) }),
  });
}

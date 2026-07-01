"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useAddReaction(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "tickets", ticketId, "reactions", "add"],
    mutationFn: ({ commentId, emoji }: { commentId: number; emoji: string }) =>
      apiClient.post<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/comments/${commentId}/reactions`,
        { emoji }
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.projects.ticket(ticketId) }),
  });
}

export function useRemoveReaction(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "tickets", ticketId, "reactions", "remove"],
    mutationFn: ({ commentId, emoji }: { commentId: number; emoji: string }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.projects.ticket(ticketId) }),
  });
}

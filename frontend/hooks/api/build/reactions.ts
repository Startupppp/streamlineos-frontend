"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";


const reactionLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.reactionContract),
);

const successLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.successContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export function useAddReaction(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "reactions", "add"],
    mutationFn: ({ commentId, emoji }: { commentId: number; emoji: string }) =>
      apiClient.post(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}/reactions`,
        { emoji },
        undefined,
        reactionLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.ticket(ticketId) }),
  });
}

export function useRemoveReaction(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "reactions", "remove"],
    mutationFn: ({ commentId, emoji }: { commentId: number; emoji: string }) =>
      apiClient.delete<void>(
        `/build/${projectId}/tickets/${ticketId}/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.ticket(ticketId) }),
  });
}

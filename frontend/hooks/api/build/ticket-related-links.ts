"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const relatedLinkCreateLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.relatedLinkCreateContract),
);

export interface TicketRelatedLink {
  id: number;
  url: string;
  label: string | null;
  createdAt: string;
}

const relatedLinksKey = (projectId: number, ticketId: number) =>
  ["projects", projectId, "tickets", ticketId, "related-links"] as const;

interface AddLinkVars {
  projectId: number;
  ticketId: number;
  url: string;
  label?: string;
}

export function useAddRelatedLink(
  options?: UseMutationOptions<TicketRelatedLink, unknown, AddLinkVars>,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<TicketRelatedLink, unknown, AddLinkVars>("build:tickets:update", {
    ...options,
    mutationKey: ["projects", "tickets", "related-links", "add"],
    mutationFn: ({ projectId, ticketId, url, label }) =>
      apiClient.post<TicketRelatedLink>(`/build/${projectId}/tickets/${ticketId}/related-links`, { url, label }, undefined, relatedLinkCreateLazy),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: relatedLinksKey(variables.projectId, variables.ticketId) });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}


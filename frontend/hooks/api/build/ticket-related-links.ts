"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
  return useMutation<TicketRelatedLink, unknown, AddLinkVars>({
    mutationKey: ["projects", "tickets", "related-links", "add"],
    mutationFn: ({ projectId, ticketId, url, label }) =>
      apiClient.post<TicketRelatedLink>(`/build/${projectId}/tickets/${ticketId}/related-links`, { url, label }),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: relatedLinksKey(variables.projectId, variables.ticketId) });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
}

interface DeleteLinkVars {
  projectId: number;
  ticketId: number;
  linkId: number;
}

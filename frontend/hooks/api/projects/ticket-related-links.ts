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

export function useTicketRelatedLinks(projectId: number, ticketId: number) {
  return useQuery<TicketRelatedLink[]>({
    queryKey: relatedLinksKey(projectId, ticketId),
    queryFn: () =>
      apiClient.get<TicketRelatedLink[]>(`/projects/${projectId}/tickets/${ticketId}/related-links`),
    enabled: !!projectId && !!ticketId,
    staleTime: 60_000,
  });
}

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
      apiClient.post<TicketRelatedLink>(`/projects/${projectId}/tickets/${ticketId}/related-links`, { url, label }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: relatedLinksKey(variables.projectId, variables.ticketId) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

interface DeleteLinkVars {
  projectId: number;
  ticketId: number;
  linkId: number;
}

export function useDeleteRelatedLink(
  options?: UseMutationOptions<void, unknown, DeleteLinkVars>,
) {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, DeleteLinkVars>({
    mutationKey: ["projects", "tickets", "related-links", "delete"],
    mutationFn: ({ projectId, ticketId, linkId }) =>
      apiClient.delete<void>(`/projects/${projectId}/tickets/${ticketId}/related-links/${linkId}`),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: relatedLinksKey(variables.projectId, variables.ticketId) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

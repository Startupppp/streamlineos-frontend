"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type ExternalEntityType = "project" | "invoice" | "calendar_event" | "chat_channel";

export interface SupportTicketExternalLink {
  id: number;
  orgId: string;
  ticketId: number;
  entityType: ExternalEntityType;
  entityId: number;
  label: string;
  createdBy: string | null;
  createdAt: string | null;
}

export function useSupportTicketExternalLinks(ticketId: number) {
  return useGatedQuery("support:tickets:view", {
    queryKey: [...platformCoreQueryKeys.support.detail(ticketId), "external-links"] as const,
    queryFn: ({ signal }) => apiClient.get<SupportTicketExternalLink[]>(`/support/${ticketId}/external-links`, undefined, signal),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useAddExternalLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["add", "external", "link"],
    mutationFn: ({
      ticketId,
      entityType,
      entityId,
    }: {
      ticketId: number;
      entityType: ExternalEntityType;
      entityId: number;
    }) =>
      apiClient.post<SupportTicketExternalLink>(`/support/${ticketId}/external-links`, {
        entityType,
        entityId,
      }),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: [...platformCoreQueryKeys.support.detail(vars.ticketId), "external-links"] }),
  });
}

export function useRemoveExternalLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["remove", "external", "link"],
    mutationFn: ({ ticketId, linkId }: { ticketId: number; linkId: number }) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/external-links/${linkId}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: [...platformCoreQueryKeys.support.detail(vars.ticketId), "external-links"] }),
  });
}

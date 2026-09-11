"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const supportTicketLinkListContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.supportTicketLinkListContract),
);
const addTicketLinkContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.addTicketLinkContract),
);
const mergeTicketContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.mergeTicketContract),
);

export type TicketLinkRelation = "duplicate" | "related" | "split";

export interface SupportTicketLink {
  id: number;
  orgId: string;
  ticketId: number;
  linkedTicketId: number;
  relation: TicketLinkRelation;
  createdBy: string | null;
  createdAt: string | null;
  linkedTicket: { id: number; title: string; status: string } | null;
}

export function useSupportTicketLinks(ticketId: number) {
  return useGatedQuery("support:tickets:view", {
    queryKey: [...platformCoreQueryKeys.support.detail(ticketId), "links"] as const,
    queryFn: ({ signal }) => apiClient.get<SupportTicketLink[]>(`/support/${ticketId}/links`, undefined, signal, supportTicketLinkListContract),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useAddTicketLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["add", "ticket", "link"],
    mutationFn: ({
      ticketId,
      linkedTicketId,
      relation,
    }: {
      ticketId: number;
      linkedTicketId: number;
      relation: TicketLinkRelation;
    }) =>
      apiClient.post(`/support/${ticketId}/links`, { linkedTicketId, relation }, undefined, addTicketLinkContract),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(vars.ticketId) }),
  });
}

export function useMergeTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["merge", "ticket"],
    mutationFn: ({ ticketId, intoTicketId }: { ticketId: number; intoTicketId: number }) =>
      apiClient.post<{ success: boolean; mergedIntoTicketId: number }>(`/support/${ticketId}/merge`, {
        intoTicketId,
      }, undefined, mergeTicketContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(vars.ticketId) });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.all });
    },
  });
}

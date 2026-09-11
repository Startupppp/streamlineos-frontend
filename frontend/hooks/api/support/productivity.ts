"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const snoozeTicketContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.snoozeTicketContract),
);
const successContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.successContract),
);
const splitTicketContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.splitTicketContract),
);
const supportTicketDraftContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.supportTicketDraftContract),
);

export interface SupportTicketDraft {
  id: number;
  orgId: string;
  ticketId: number;
  userId: string;
  body: string;
  isInternal: boolean;
  updatedAt: string | null;
}

export function useSnoozeTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["snooze", "ticket"],
    mutationFn: ({ ticketId, snoozedUntil }: { ticketId: number; snoozedUntil: Date }) =>
      apiClient.post<{ success: boolean; snoozedUntil: string }>(`/support/${ticketId}/snooze`, {
        snoozedUntil: snoozedUntil.toISOString(),
      }, undefined, snoozeTicketContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(vars.ticketId) });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.all });
    },
  });
}

export function useUnsnoozeTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["unsnooze", "ticket"],
    mutationFn: (ticketId: number) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/snooze`, undefined, undefined, successContract),
    onSuccess: (_, ticketId) => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(ticketId) });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.all });
    },
  });
}

export function useSplitTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["split", "ticket"],
    mutationFn: ({
      ticketId,
      title,
      description,
    }: {
      ticketId: number;
      title: string;
      description?: string;
    }) => apiClient.post<{ id: number }>(`/support/${ticketId}/split`, { title, description }, undefined, splitTicketContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(vars.ticketId) });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.all });
    },
  });
}

export function useTicketDraft(ticketId: number) {
  return useGatedQuery("support:tickets:view", {
    queryKey: [...platformCoreQueryKeys.support.detail(ticketId), "draft"] as const,
    queryFn: ({ signal }) => apiClient.get(`/support/${ticketId}/draft`, undefined, signal, supportTicketDraftContract),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 60_000,
  });
}

export function useUpsertTicketDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportTicketDraft", "upsert"],
    mutationFn: ({
      ticketId,
      body,
      isInternal,
    }: {
      ticketId: number;
      body: string;
      isInternal?: boolean;
    }) => apiClient.put(`/support/${ticketId}/draft`, { body, isInternal }, undefined, supportTicketDraftContract),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: [...platformCoreQueryKeys.support.detail(vars.ticketId), "draft"] }),
  });
}

export function useDeleteTicketDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportTicketDraft", "delete"],
    mutationFn: (ticketId: number) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/draft`, undefined, undefined, successContract),
    onSuccess: (_, ticketId) =>
      qc.invalidateQueries({ queryKey: [...platformCoreQueryKeys.support.detail(ticketId), "draft"] }),
  });
}

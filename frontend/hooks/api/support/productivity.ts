"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
      }),
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
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/snooze`),
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
    }) => apiClient.post<{ id: number }>(`/support/${ticketId}/split`, { title, description }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(vars.ticketId) });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.all });
    },
  });
}

export function useTicketDraft(ticketId: number) {
  return useGatedQuery("support:tickets:view", {
    queryKey: [...platformCoreQueryKeys.support.detail(ticketId), "draft"] as const,
    queryFn: ({ signal }) => apiClient.get<SupportTicketDraft | null>(`/support/${ticketId}/draft`, undefined, signal),
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
    }) => apiClient.put<SupportTicketDraft>(`/support/${ticketId}/draft`, { body, isInternal }),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: [...platformCoreQueryKeys.support.detail(vars.ticketId), "draft"] }),
  });
}

export function useDeleteTicketDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportTicketDraft", "delete"],
    mutationFn: (ticketId: number) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/draft`),
    onSuccess: (_, ticketId) =>
      qc.invalidateQueries({ queryKey: [...platformCoreQueryKeys.support.detail(ticketId), "draft"] }),
  });
}

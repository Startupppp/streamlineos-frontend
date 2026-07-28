"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useMutation({
    mutationKey: ["snooze", "ticket"],
    mutationFn: ({ ticketId, snoozedUntil }: { ticketId: number; snoozedUntil: Date }) =>
      apiClient.post<{ success: boolean; snoozedUntil: string }>(`/support/${ticketId}/snooze`, {
        snoozedUntil: snoozedUntil.toISOString(),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.support.detail(vars.ticketId) });
      qc.invalidateQueries({ queryKey: queryKeys.support.all });
    },
  });
}

export function useUnsnoozeTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["unsnooze", "ticket"],
    mutationFn: (ticketId: number) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/snooze`),
    onSuccess: (_data, ticketId) => {
      qc.invalidateQueries({ queryKey: queryKeys.support.detail(ticketId) });
      qc.invalidateQueries({ queryKey: queryKeys.support.all });
    },
  });
}

export function useSplitTicket() {
  const qc = useQueryClient();
  return useMutation({
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.support.detail(vars.ticketId) });
      qc.invalidateQueries({ queryKey: queryKeys.support.all });
    },
  });
}

export function useTicketDraft(ticketId: number) {
  return useQuery({
    queryKey: [...queryKeys.support.detail(ticketId), "draft"] as const,
    queryFn: () => apiClient.get<SupportTicketDraft | null>(`/support/${ticketId}/draft`),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 60_000,
  });
}

export function useUpsertTicketDraft() {
  const qc = useQueryClient();
  return useMutation({
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
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: [...queryKeys.support.detail(vars.ticketId), "draft"] }),
  });
}

export function useDeleteTicketDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportTicketDraft", "delete"],
    mutationFn: (ticketId: number) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/draft`),
    onSuccess: (_data, ticketId) =>
      qc.invalidateQueries({ queryKey: [...queryKeys.support.detail(ticketId), "draft"] }),
  });
}

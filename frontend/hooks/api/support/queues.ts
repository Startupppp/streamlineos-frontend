"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface SupportQueue {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  filter: Record<string, unknown>;
  sortOrder: number;
  isDefault: boolean;
  openTicketCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CreateQueueInput {
  name: string;
  description?: string;
  filter?: Record<string, unknown>;
  sortOrder?: number;
  isDefault?: boolean;
}

interface UpdateQueueInput {
  name?: string;
  description?: string | null;
  filter?: Record<string, unknown>;
  sortOrder?: number;
  isDefault?: boolean;
}

export function useSupportQueues() {
  return useQuery({
    queryKey: queryKeys.supportQueues.list(),
    queryFn: () => apiClient.get<SupportQueue[]>("/support/queues"),
    staleTime: 60_000,
  });
}

export function useCreateQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQueueInput) => apiClient.post<SupportQueue>("/support/queues", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportQueues.all }),
  });
}

export function useUpdateQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateQueueInput & { id: number }) =>
      apiClient.patch<SupportQueue>(`/support/queues/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportQueues.all }),
  });
}

export function useDeleteQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/support/queues/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportQueues.all }),
  });
}

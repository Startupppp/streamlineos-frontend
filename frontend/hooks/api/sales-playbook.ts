"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface PlaybookEntry {
  id: number;
  orgId: string;
  title: string;
  category: string | null;
  content: string;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CreatePlaybookEntryInput {
  title: string;
  category?: string;
  content?: string;
  sortOrder?: number;
}

interface UpdatePlaybookEntryInput {
  title?: string;
  category?: string | null;
  content?: string;
  sortOrder?: number;
}

export function usePlaybookEntries() {
  return useQuery({
    queryKey: queryKeys.playbook.list(),
    queryFn: () => apiClient.get<PlaybookEntry[]>("/sales/playbook"),
    staleTime: 60_000,
  });
}

export function useCreatePlaybookEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlaybookEntryInput) =>
      apiClient.post<PlaybookEntry>("/sales/playbook", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.playbook.all }),
  });
}

export function useUpdatePlaybookEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePlaybookEntryInput & { id: number }) =>
      apiClient.patch<PlaybookEntry>(`/sales/playbook/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.playbook.all }),
  });
}

export function useDeletePlaybookEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/sales/playbook/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.playbook.all }),
  });
}

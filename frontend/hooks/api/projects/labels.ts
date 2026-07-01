"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface TicketLabel {
  id: number;
  orgId: string;
  name: string;
  color: string;
}

const LABELS_KEY = ["projects", "labels"] as const;

export function useOrgLabels() {
  return useQuery<TicketLabel[]>({
    queryKey: LABELS_KEY,
    queryFn: () => apiClient.get<TicketLabel[]>("/projects/labels"),
    staleTime: 60_000,
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "labels", "create"],
    mutationFn: (data: { name: string; color: string }) =>
      apiClient.post<TicketLabel>("/projects/labels", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: LABELS_KEY }),
  });
}

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "labels", "update"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; color?: string }) =>
      apiClient.patch<TicketLabel>(`/projects/labels/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: LABELS_KEY }),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "labels", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/projects/labels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: LABELS_KEY }),
  });
}

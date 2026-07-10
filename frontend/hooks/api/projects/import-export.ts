"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ExportTicketRow {
  number: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  points: number | null;
  dueDate: string | null;
  assignee: string;
}

export interface ImportTicketRow {
  title: string;
  type?: "TASK" | "BUG" | "STORY" | "EPIC";
  status?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  points?: number;
  assigneeEmail?: string;
  dueDate?: string;
}

export interface ImportTicketsPayload {
  rows: ImportTicketRow[];
}

export interface ImportTicketsResult {
  created: number;
  skipped: { row: number; reason: string }[];
}

export function useExportTickets(projectId: number) {
  return useQuery<ExportTicketRow[]>({
    queryKey: [...queryKeys.projects.all, projectId, "export"],
    queryFn: () => apiClient.get<ExportTicketRow[]>(`/projects/${projectId}/tickets/export`),
    enabled: false,
    staleTime: 0,
  });
}

export function useImportTickets(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<ImportTicketsResult, Error, ImportTicketsPayload>({
    mutationKey: ["projects", projectId, "tickets", "import"],
    mutationFn: (body) =>
      apiClient.post<ImportTicketsResult>(`/projects/${projectId}/tickets/import`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
    },
  });
}

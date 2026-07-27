"use client";

import { useQuery } from "@tanstack/react-query";
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
  assignee: string | null;
}

export function useExportTickets(projectId: number) {
  return useQuery<ExportTicketRow[]>({
    queryKey: [...queryKeys.projects.all, projectId, "export"],
    queryFn: () => apiClient.get<ExportTicketRow[]>(`/build/${projectId}/tickets/export`),
    enabled: false,
    staleTime: 0,
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Checklist, ChecklistItem } from "@/types/projects";

function checklistKeys(projectId: number, ticketId: number) {
  return ["projects", projectId, "tickets", ticketId, "checklists"] as const;
}

export function useChecklists(projectId: number, ticketId: number) {
  return useQuery<Checklist[]>({
    queryKey: checklistKeys(projectId, ticketId),
    queryFn: () =>
      apiClient.get<Checklist[]>(
        `/projects/${projectId}/tickets/${ticketId}/checklists`,
      ),
    enabled: !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}

export function useCreateChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "projects",
      projectId,
      "tickets",
      ticketId,
      "checklists",
      "create",
    ],
    mutationFn: (title: string) =>
      apiClient.post<Checklist>(
        `/projects/${projectId}/tickets/${ticketId}/checklists`,
        { title },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useUpdateChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "projects",
      projectId,
      "tickets",
      ticketId,
      "checklists",
      "update",
    ],
    mutationFn: ({
      checklistId,
      title,
    }: {
      checklistId: number;
      title: string;
    }) =>
      apiClient.patch<Checklist>(
        `/projects/${projectId}/tickets/${ticketId}/checklists/${checklistId}`,
        { title },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useDeleteChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "projects",
      projectId,
      "tickets",
      ticketId,
      "checklists",
      "delete",
    ],
    mutationFn: (checklistId: number) =>
      apiClient.delete(
        `/projects/${projectId}/tickets/${ticketId}/checklists/${checklistId}`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useCreateChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "projects",
      projectId,
      "tickets",
      ticketId,
      "checklist-items",
      "create",
    ],
    mutationFn: ({
      checklistId,
      text,
      order = 0,
    }: {
      checklistId: number;
      text: string;
      order?: number;
    }) =>
      apiClient.post<ChecklistItem>(
        `/projects/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items`,
        { text, order },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useUpdateChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "projects",
      projectId,
      "tickets",
      ticketId,
      "checklist-items",
      "update",
    ],
    mutationFn: ({
      checklistId,
      itemId,
      ...data
    }: {
      checklistId: number;
      itemId: number;
      text?: string;
      isCompleted?: boolean;
      order?: number;
    }) =>
      apiClient.patch<ChecklistItem>(
        `/projects/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items/${itemId}`,
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useDeleteChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "projects",
      projectId,
      "tickets",
      ticketId,
      "checklist-items",
      "delete",
    ],
    mutationFn: ({
      checklistId,
      itemId,
    }: {
      checklistId: number;
      itemId: number;
    }) =>
      apiClient.delete(
        `/projects/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items/${itemId}`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

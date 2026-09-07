"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type { Checklist, ChecklistItem } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";


const checklistListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.checklistListContract),
);
const checklistRowLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.checklistRowContract),
);
const checklistItemLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.checklistItemContract),
);
const successLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.successContract),
);

function checklistKeys(projectId: number, ticketId: number) {
  return ["projects", projectId, "tickets", ticketId, "checklists"] as const;
}

export function useChecklists(projectId: number, ticketId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery<Checklist[]>({
    queryKey: checklistKeys(projectId, ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<Checklist[]>(
        `/build/${projectId}/tickets/${ticketId}/checklists`, undefined, signal, checklistListLazy,
      ),
    enabled: canView && !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}

export function useCreateChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
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
        `/build/${projectId}/tickets/${ticketId}/checklists`,
        { title },
        undefined,
        checklistRowLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useUpdateChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
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
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}`,
        { title },
        undefined,
        checklistRowLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useDeleteChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
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
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}`,
        undefined,
        undefined,
        successLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useCreateChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
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
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items`,
        { text, order },
        undefined,
        checklistItemLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useUpdateChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
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
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items/${itemId}`,
        data,
        undefined,
        checklistItemLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

export function useDeleteChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
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
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items/${itemId}`,
        undefined,
        undefined,
        successLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: checklistKeys(projectId, ticketId) }),
  });
}

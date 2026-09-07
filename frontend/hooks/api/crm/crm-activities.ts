"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

import { lazyContract } from "@/lib/api-envelope";
const tasksListLazy = lazyContract(() => import("@/hooks/api/crm/crm-activities-schema").then((m) => m.tasksListContract));
const taskRowLazy = lazyContract(() => import("@/hooks/api/crm/crm-activities-schema").then((m) => m.taskRowContract));

export type CrmActivityType = "CALL" | "EMAIL" | "MEETING" | "CUSTOM";
export type CrmActivityEntityType = "LEAD" | "DEAL" | "CONTACT";
export type CrmActivityStatus = "pending" | "completed" | "cancelled";

export interface CrmActivity {
  id: number;
  orgId: string;
  title: string;
  notes: string | null;
  entityType: CrmActivityEntityType | null;
  entityId: number | null;
  type: CrmActivityType;
  status: CrmActivityStatus;
  assigneeId: string | null;
  createdBy: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CrmActivitiesFilters {
  type?: CrmActivityType;
  entityType?: CrmActivityEntityType;
  status?: CrmActivityStatus;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

export interface CrmActivitiesResponse {
  tasks: CrmActivity[];
  total: number;
  page: number;
  limit: number;
}

export interface LogCrmActivityInput {
  title: string;
  type: CrmActivityType;
  notes?: string;
  entityType?: CrmActivityEntityType;
  entityId?: number;
  assigneeId?: string;
  dueDate?: string;
}

function buildParams(filters?: CrmActivitiesFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 30,
  };
  if (filters?.type) params.type = filters.type;
  if (filters?.entityType) params.entityType = filters.entityType;
  if (filters?.status) params.status = filters.status;
  if (filters?.assigneeId) params.assigneeId = filters.assigneeId;
  return params;
}

export function useCrmActivities(filters?: CrmActivitiesFilters) {
  return useGatedQuery("tasks:read", {
    queryKey: queryKeys.crmActivities.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<CrmActivitiesResponse>("/tasks", buildParams(filters), signal, tasksListLazy),
    staleTime: 60_000,
  });
}

export function useLogCrmActivity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("tasks:write", {
    mutationKey: ["crm-activities", "create"] as const,
    mutationFn: (input: LogCrmActivityInput) =>
      apiClient.post<CrmActivity>("/tasks", input, undefined, taskRowLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmActivities.all });
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useCompleteCrmActivity() {
  const qc = useQueryClient();
  return useAuthorizedMutation("tasks:write", {
    mutationKey: ["crm-activities", "complete"] as const,
    mutationFn: (activityId: number) =>
      apiClient.post<CrmActivity>(`/tasks/${activityId}/complete`, {}, undefined, taskRowLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmActivities.all });
    },
  });
}

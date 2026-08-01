"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";


export type TaskEntityType = "LEAD" | "DEAL" | "CONTACT" | "PROJECT";
export type TaskType = "CALL" | "EMAIL" | "MEETING" | "DEMO" | "FOLLOW_UP" | "REMINDER" | "CUSTOM";
export type TaskStatus = "pending" | "completed" | "cancelled";
export type TaskBucket = "OVERDUE" | "TODAY" | "THIS_WEEK" | "UPCOMING" | "NO_DATE";

export interface Task {
  id: number;
  orgId: string;
  title: string;
  notes: string | null;
  entityType: TaskEntityType | null;
  entityId: number | null;
  type: TaskType;
  status: TaskStatus;
  assigneeId: string | null;
  createdBy: string | null;
  dueDate: string | null;
  remindAt: string | null;
  completedAt: string | null;
  timezone: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TaskWithBucket extends Task {
  bucket: TaskBucket;
}

interface TasksListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  entityType?: TaskEntityType;
  entityId?: number;
  type?: TaskType;
  assigneeId?: string;
  dueDate?: string;
  remindAt?: string;
  timezone?: string;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string;
  entityType?: TaskEntityType;
  entityId?: number;
  type?: TaskType;
  assigneeId?: string;
  dueDate?: string;
  status?: TaskStatus;
}

export interface TasksFilters {
  assigneeId?: string;
  status?: TaskStatus;
  type?: TaskType;
  entityType?: TaskEntityType;
  entityId?: number;
  limit?: number;
  page?: number;
}


export function useTasks(filters?: TasksFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<TasksListResponse>("/tasks", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["tasks", "create"],
    mutationFn: (input: CreateTaskInput) => apiClient.post<Task>("/tasks", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["tasks", "update"],
    mutationFn: ({ taskId, input }: { taskId: number; input: UpdateTaskInput }) =>
      apiClient.patch<Task>(`/tasks/${taskId}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["tasks", "delete"],
    mutationFn: (taskId: number) =>
      apiClient.delete<{ success: boolean }>(`/tasks/${taskId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["tasks", "complete"],
    mutationFn: ({ taskId, completedAt }: { taskId: number; completedAt?: string }) =>
      apiClient.post<Task>(`/tasks/${taskId}/complete`, { completedAt }),
    onMutate: async ({ taskId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.tasks.myQueue() });
      const prev = qc.getQueryData<TaskWithBucket[]>(queryKeys.tasks.myQueue());
      qc.setQueryData<TaskWithBucket[]>(queryKeys.tasks.myQueue(), (old) =>
        (old ?? []).filter((t) => t.id !== taskId),
      );
      return { prev };
    },
    onError: (_, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.tasks.myQueue(), ctx.prev);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

interface TaskRepStat {
  assigneeId: string | null;
  name: string;
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

interface TaskAnalytics {
  period: number;
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
  perRep: TaskRepStat[];
}

export function useTaskAnalytics(days = 30) {
  return useQuery({
    queryKey: [...queryKeys.tasks.all, "analytics", days] as const,
    queryFn: () => apiClient.get<TaskAnalytics>(`/tasks/analytics?days=${days}`),
    staleTime: 120_000,
  });
}


interface TaskSequenceStep {
  id: number;
  sequenceId: number;
  title: string;
  type: string;
  notes: string | null;
  offsetDays: number;
  order: number;
}


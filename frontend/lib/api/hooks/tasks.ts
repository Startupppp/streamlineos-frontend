"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";


export type TaskEntityType = "LEAD" | "DEAL" | "CONTACT" | "PROJECT";
export type TaskType = "CALL" | "EMAIL" | "MEETING" | "CUSTOM";
type TaskStatus = "pending" | "completed" | "cancelled";
type TaskBucket = "OVERDUE" | "TODAY" | "THIS_WEEK" | "UPCOMING" | "NO_DATE";

interface Task {
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

interface TaskWithBucket extends Task {
  bucket: TaskBucket;
}

interface TasksListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

interface CreateTaskInput {
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

interface TasksFilters {
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
    mutationFn: (input: CreateTaskInput) => apiClient.post<Task>("/tasks", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
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
    onError: (_err, _vars, ctx) => {
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

export interface TaskSequence {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string | null;
  steps: TaskSequenceStep[];
}

interface CreateTaskSequenceInput {
  name: string;
  description?: string;
  steps: Array<{
    title: string;
    type?: string;
    notes?: string;
    offsetDays?: number;
    order?: number;
  }>;
}

export interface ApplySequenceInput {
  baseDate: string;
  entityType?: TaskEntityType;
  entityId?: number;
  assigneeId?: string;
}

export function useTaskSequences() {
  return useQuery({
    queryKey: queryKeys.tasks.sequences(),
    queryFn: () => apiClient.get<TaskSequence[]>("/tasks/sequences"),
    staleTime: 60_000,
  });
}

export function useCreateTaskSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskSequenceInput) =>
      apiClient.post<TaskSequence>("/tasks/sequences", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.sequences() });
    },
  });
}

export function useDeleteTaskSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sequenceId: number) =>
      apiClient.delete<{ success: boolean }>(`/tasks/sequences/${sequenceId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.sequences() });
    },
  });
}

export function useApplyTaskSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, input }: { sequenceId: number; input: ApplySequenceInput }) =>
      apiClient.post<{ created: Task[]; count: number }>(
        `/tasks/sequences/${sequenceId}/apply`,
        input,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}



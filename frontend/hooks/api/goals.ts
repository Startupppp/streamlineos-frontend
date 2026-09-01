"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type GoalLevel = "company" | "team" | "individual";
export type GoalStatus = "not_started" | "on_track" | "at_risk" | "off_track" | "completed";
export type KeyResultMetric = "number" | "percentage" | "currency" | "boolean";

interface GoalOwner {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface GoalListItem {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  level: GoalLevel;
  status: GoalStatus;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  parentGoalId: number | null;
  projectId: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  owner: GoalOwner | null;
  keyResultCount: number;
}

export interface KeyResult {
  id: number;
  orgId: string;
  goalId: number;
  title: string;
  metricType: KeyResultMetric;
  startValue: string;
  targetValue: string;
  currentValue: string;
  unit: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

interface GoalUpdate {
  id: number;
  keyResultId: number | null;
  note: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userImage: string | null;
}

interface GoalLink {
  id: number;
  ticketId: number | null;
  projectId: number | null;
  createdAt: string;
  ticketTitle: string | null;
  ticketProjectId: number | null;
  projectName: string | null;
  projectKey: string | null;
}

export interface GoalDetail extends Omit<GoalListItem, "keyResultCount"> {
  project: { id: number; name: string; key: string } | null;
  keyResults: KeyResult[];
  updates: GoalUpdate[];
  links: GoalLink[];
}

interface GoalStats {
  total: number;
  byStatus: Record<GoalStatus, number>;
  avgProgress: number;
  atRisk: number;
  completed: number;
}

interface GoalsParams {
  status?: GoalStatus;
  level?: GoalLevel;
  ownerId?: string;
  projectId?: number;
  search?: string;
}

export interface KeyResultInput {
  title: string;
  metricType?: KeyResultMetric;
  startValue?: number;
  targetValue: number;
  currentValue?: number;
  unit?: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  ownerId?: string;
  level?: GoalLevel;
  status?: GoalStatus;
  startDate?: string;
  dueDate?: string;
  parentGoalId?: number;
  projectId?: number;
  keyResults?: KeyResultInput[];
}

interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  ownerId?: string | null;
  level?: GoalLevel;
  status?: GoalStatus;
  startDate?: string | null;
  dueDate?: string | null;
  parentGoalId?: number | null;
  projectId?: number | null;
}

interface CheckInInput {
  keyResultId: number;
  newValue: number;
  note?: string;
}

interface AddGoalLinkInput {
  ticketId?: number;
  projectId?: number;
}

function goalLinksKey(goalId: number) {
  return [...queryKeys.goals.detail(goalId), "links"] as const;
}

function toQueryParams(params?: GoalsParams): Record<string, unknown> | undefined {
  if (!params) return undefined;
  return { ...params };
}

export function useGoals(params?: GoalsParams) {
  const queryParams = toQueryParams(params);
  return useQuery({
    queryKey: queryKeys.goals.list(queryParams),
    queryFn: ({ signal }) => apiClient.get<GoalListItem[]>("/goals", queryParams, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useGoal(id: number) {
  return useQuery({
    queryKey: queryKeys.goals.detail(id),
    queryFn: ({ signal }) => apiClient.get<GoalDetail>(`/goals/${id}`, undefined, signal),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useGoalStats() {
  return useQuery({
    queryKey: queryKeys.goals.stats(),
    queryFn: ({ signal }) => apiClient.get<GoalStats>("/goals/stats", undefined, signal),
    staleTime: 60_000,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "goal"],
    mutationFn: (input: CreateGoalInput) => apiClient.post<GoalListItem>("/goals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["update", "goal"],
    mutationFn: ({ id, ...input }: UpdateGoalInput & { id: number }) =>
      apiClient.patch<GoalListItem>(`/goals/${id}`, input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.all });
      qc.invalidateQueries({ queryKey: queryKeys.goals.detail(variables.id) });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["delete", "goal"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/goals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

export function useCheckIn(goalId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["check", "in"],
    mutationFn: (input: CheckInInput) =>
      apiClient.post<GoalListItem>(`/goals/${goalId}/check-in`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.detail(goalId) });
      qc.invalidateQueries({ queryKey: queryKeys.goals.all });
      qc.invalidateQueries({ queryKey: queryKeys.goals.stats() });
    },
  });
}

export function useAddGoalLink(goalId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["add", "goal", "link"],
    mutationFn: (input: AddGoalLinkInput) =>
      apiClient.post<GoalLink>(`/goals/${goalId}/links`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalLinksKey(goalId) });
      qc.invalidateQueries({ queryKey: queryKeys.goals.detail(goalId) });
    },
  });
}

export function useRemoveGoalLink(goalId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["remove", "goal", "link"],
    mutationFn: (linkId: number) =>
      apiClient.delete<{ success: boolean }>(`/goals/${goalId}/links?linkId=${linkId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalLinksKey(goalId) });
      qc.invalidateQueries({ queryKey: queryKeys.goals.detail(goalId) });
    },
  });
}

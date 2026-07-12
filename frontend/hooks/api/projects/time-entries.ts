"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  TimeEntry,
  TimeEntryWithUser,
  TimeEntryFilters,
  LogTimeInput,
  UpdateTimeEntryInput,
} from "@/types/projects";

export function useTimeEntries(
  filters?: TimeEntryFilters,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: queryKeys.projects.timeEntries(filters ? { ...filters } : undefined),
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries", filters ? { ...filters } : undefined),
    staleTime: 30_000,
    ...options,
  });
}

export function useMyTimeEntries(
  userId: string,
  filters?: Omit<TimeEntryFilters, "userId">,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: queryKeys.projects.timeEntries({ userId, ...filters }),
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries", {
        userId,
        ...filters,
      }),
    enabled: !!userId,
    staleTime: 30_000,
    ...options,
  });
}

export function useLogTime(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "time-entries", "log"],
    mutationFn: ({ projectId, ticketId, ...data }: LogTimeInput) =>
      apiClient.post<TimeEntry>(
        `/projects/${projectId}/tickets/${ticketId}/time-entries`,
        data
      ),
    onSuccess: (_data: unknown, variables: LogTimeInput) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.projects.all, "timeEntries"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useUpdateTimeEntry(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "time-entries", "update"],
    mutationFn: ({ entryId, ...data }: UpdateTimeEntryInput) =>
      apiClient.patch<TimeEntry>(`/projects/time-entries/${entryId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.projects.all, "timeEntries"],
      });
    },
    ...options,
  });
}

export function useDeleteTimeEntry(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "time-entries", "delete"],
    mutationFn: ({ entryId }: { entryId: number }) =>
      apiClient.delete<{ success: boolean }>(`/projects/time-entries/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.projects.all, "timeEntries"],
      });
    },
    ...options,
  });
}

interface TeamTimesheetFilters {
  userId?: string;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
}

export function useAllTeamTimesheets(
  filters?: TeamTimesheetFilters,
  options?: Omit<UseQueryOptions<TimeEntryWithUser[]>, "queryKey" | "queryFn">
) {
  return useQuery<TimeEntryWithUser[]>({
    queryKey: [...queryKeys.projects.timeEntries(filters ? { ...filters } : undefined), "team"] as const,
    queryFn: () =>
      apiClient.get<TimeEntryWithUser[]>("/projects/time-entries/team", filters ? { ...filters } : undefined),
    staleTime: 30_000,
    ...options,
  });
}

export function useApproveTimesheet(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "time-entries", "approve"],
    mutationFn: ({ timesheetId }: { timesheetId: number }) =>
      apiClient.patch<{ success: boolean }>(`/projects/time-entries/${timesheetId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.projects.all, "timeEntries"] });
    },
    ...options,
  });
}

export function useRejectTimesheet(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "time-entries", "reject"],
    mutationFn: ({ timesheetId, reason }: { timesheetId: number; reason?: string }) =>
      apiClient.patch<{ success: boolean }>(`/projects/time-entries/${timesheetId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.projects.all, "timeEntries"] });
    },
    ...options,
  });
}

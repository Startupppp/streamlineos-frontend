"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Meeting,
  MeetingDetail,
  ActionItem,
  MeetingAttendee,
  StandupEntry,
  CreateMeetingInput,
  UpdateMeetingInput,
  CreateActionItemInput,
  UpdateActionItemInput,
  UpsertStandupInput,
  AddAttendeeInput,
} from "@/types/projects";

interface MeetingFilters {
  status?: string;
  type?: string;
}

export function useMeetings(projectId: number, filters?: MeetingFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.type) params["type"] = filters.type;
  const hasParams = Object.keys(params).length > 0;

  return useQuery<Meeting[]>({
    queryKey: queryKeys.projects.meetings.list(projectId, hasParams ? params : undefined),
    queryFn: () => apiClient.get<Meeting[]>(`/projects/${projectId}/meetings`, hasParams ? params : undefined),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useMeeting(projectId: number, meetingId: number) {
  return useQuery<MeetingDetail>({
    queryKey: queryKeys.projects.meetings.detail(projectId, meetingId),
    queryFn: () => apiClient.get<MeetingDetail>(`/projects/${projectId}/meetings/${meetingId}`),
    enabled: !!projectId && !!meetingId,
    staleTime: 60_000,
  });
}

export function useCreateMeeting(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", "create"],
    mutationFn: (data: CreateMeetingInput) =>
      apiClient.post<Meeting>(`/projects/${projectId}/meetings`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.list(projectId) });
    },
  });
}

export function useUpdateMeeting(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", "update"],
    mutationFn: ({ id, ...data }: UpdateMeetingInput) =>
      apiClient.patch<Meeting>(`/projects/${projectId}/meetings/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, vars.id) });
    },
  });
}

export function useDeleteMeeting(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/meetings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.list(projectId) });
    },
  });
}

export function useAddAttendee(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", meetingId, "attendees", "add"],
    mutationFn: (data: AddAttendeeInput) =>
      apiClient.post<MeetingAttendee>(`/projects/${projectId}/meetings/${meetingId}/attendees`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useRemoveAttendee(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", meetingId, "attendees", "remove"],
    mutationFn: (userId: string) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/meetings/${meetingId}/attendees/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useUpsertStandup(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", meetingId, "standup"],
    mutationFn: (data: UpsertStandupInput) =>
      apiClient.put<StandupEntry>(`/projects/${projectId}/meetings/${meetingId}/standup`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useCreateActionItem(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", meetingId, "action-items", "create"],
    mutationFn: (data: CreateActionItemInput) =>
      apiClient.post<ActionItem>(`/projects/${projectId}/meetings/${meetingId}/action-items`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useUpdateActionItem(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", meetingId, "action-items", "update"],
    mutationFn: ({ id, ...data }: UpdateActionItemInput) =>
      apiClient.patch<ActionItem>(`/projects/${projectId}/meetings/${meetingId}/action-items/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useDeleteActionItem(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", meetingId, "action-items", "delete"],
    mutationFn: (itemId: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/${projectId}/meetings/${meetingId}/action-items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useConvertActionItemToTask(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", meetingId, "action-items", "convert"],
    mutationFn: (itemId: number) =>
      apiClient.post<ActionItem>(
        `/projects/${projectId}/meetings/${meetingId}/action-items/${itemId}/convert-to-task`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

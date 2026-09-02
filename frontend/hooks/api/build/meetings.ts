"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface MeetingFilters {
  status?: string;
  type?: string;
  dateFilter?: "today" | "this_week" | "upcoming" | "past";
  hostId?: string;
  attendeeId?: string;
  hasActionItems?: boolean;
  hasUnresolvedActionItems?: boolean;
}

export function useMeetings(projectId: number, filters?: MeetingFilters) {
  const canView = useCan("build:meetings:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.type) params["type"] = filters.type;
  if (filters?.dateFilter) params["dateFilter"] = filters.dateFilter;
  if (filters?.hostId) params["hostId"] = filters.hostId;
  if (filters?.attendeeId) params["attendeeId"] = filters.attendeeId;
  if (filters?.hasActionItems === true) params["hasActionItems"] = "true";
  if (filters?.hasUnresolvedActionItems === true) params["hasUnresolvedActionItems"] = "true";
  const hasParams = Object.keys(params).length > 0;

  return useQuery<Meeting[]>({
    queryKey: queryKeys.projects.meetings.list(projectId, hasParams ? params : undefined),
    queryFn: ({ signal }) => apiClient.get<Meeting[]>(`/build/${projectId}/meetings`, hasParams ? params : undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useMeeting(projectId: number, meetingId: number) {
  const canView = useCan("build:meetings:view");
  return useQuery<MeetingDetail>({
    queryKey: queryKeys.projects.meetings.detail(projectId, meetingId),
    queryFn: ({ signal }) => apiClient.get<MeetingDetail>(`/build/${projectId}/meetings/${meetingId}`, undefined, signal),
    enabled: canView && !!projectId && !!meetingId,
    staleTime: 60_000,
  });
}

export function useCreateMeeting(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", "create"],
    mutationFn: (data: CreateMeetingInput) =>
      apiClient.post<Meeting>(`/build/${projectId}/meetings`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.list(projectId) });
    },
  });
}

export function useUpdateMeeting(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:timesheets:manage", {
    mutationKey: ["projects", projectId, "meetings", "update"],
    mutationFn: ({ id, ...data }: UpdateMeetingInput) =>
      apiClient.patch<Meeting>(`/build/${projectId}/meetings/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, vars.id) });
    },
  });
}

export function useDeleteMeeting(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/meetings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.list(projectId) });
    },
  });
}

export function useAddAttendee(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", meetingId, "attendees", "add"],
    mutationFn: (data: AddAttendeeInput) =>
      apiClient.post<MeetingAttendee>(`/build/${projectId}/meetings/${meetingId}/attendees`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useRemoveAttendee(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", meetingId, "attendees", "remove"],
    mutationFn: (userId: string) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/meetings/${meetingId}/attendees/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useUpsertStandup(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", meetingId, "standup"],
    mutationFn: (data: UpsertStandupInput) =>
      apiClient.put<StandupEntry>(`/build/${projectId}/meetings/${meetingId}/standup`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useCreateActionItem(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", meetingId, "action-items", "create"],
    mutationFn: (data: CreateActionItemInput) =>
      apiClient.post<ActionItem>(`/build/${projectId}/meetings/${meetingId}/action-items`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useUpdateActionItem(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", meetingId, "action-items", "update"],
    mutationFn: ({ id, ...data }: UpdateActionItemInput) =>
      apiClient.patch<ActionItem>(`/build/${projectId}/meetings/${meetingId}/action-items/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useDeleteActionItem(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", meetingId, "action-items", "delete"],
    mutationFn: (itemId: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/meetings/${meetingId}/action-items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

export function useConvertActionItemToTask(projectId: number, meetingId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:meetings:manage", {
    mutationKey: ["projects", projectId, "meetings", meetingId, "action-items", "convert"],
    mutationFn: (itemId: number) =>
      apiClient.post<ActionItem>(
        `/build/${projectId}/meetings/${meetingId}/action-items/${itemId}/convert-to-task`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.meetings.detail(projectId, meetingId) });
    },
  });
}

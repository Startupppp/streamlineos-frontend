"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CalendarMeetingWorkspace } from "./calendar-meeting-workspace-schema";

const workspaceContract = lazyContract(() =>
  import("./calendar-meeting-workspace-schema").then((module) => module.calendarMeetingWorkspaceContract),
);
const optionalWorkspaceContract = lazyContract(() =>
  import("./calendar-meeting-workspace-schema").then((module) => module.calendarMeetingWorkspaceOptionalContract),
);

export interface CalendarMeetingSourceCommand {
  sourceKey: string;
  sourceRecordId: string;
  entityType: string;
  sourceActionId: string;
  expectedSourceVersion: string;
  intendedEffect: string;
  input: Record<string, unknown>;
}

export function useCalendarMeetingWorkspace(eventId: number | null) {
  return useGatedQuery("calendar:read", {
    queryKey: platformHierarchyQueryKeys.calendar.meetingWorkspace(eventId ?? 0),
    queryFn: ({ signal }) => apiClient.get<CalendarMeetingWorkspace | null>(
      `/calendar/events/${eventId}/meeting-workspace`,
      undefined,
      signal,
      optionalWorkspaceContract,
    ),
    enabled: eventId !== null,
    staleTime: 15_000,
  });
}

function useWorkspaceMutation<TInput>(key: string, execute: (input: TInput) => Promise<CalendarMeetingWorkspace>) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: ["calendar", "meeting-workspace", key],
    mutationFn: execute,
    onSuccess: (workspace) => {
      queryClient.setQueryData(
        platformHierarchyQueryKeys.calendar.meetingWorkspace(workspace.eventId),
        workspace,
      );
    },
  });
}

export function useInitializeCalendarMeetingWorkspace() {
  return useWorkspaceMutation<number>("initialize", (eventId) =>
    apiClient.post<CalendarMeetingWorkspace>(
      `/calendar/events/${eventId}/meeting-workspace`,
      {},
      undefined,
      workspaceContract,
    ),
  );
}

export function useUpdateCalendarMeetingWorkspace() {
  return useWorkspaceMutation<{
    workspaceId: string;
    expectedVersion: number;
    retentionUntil?: string | null;
    recordingConsentStatus?: "PENDING" | "GRANTED" | "WITHDRAWN";
  }>("update", ({ workspaceId, ...body }) =>
    apiClient.patch<CalendarMeetingWorkspace>(
      `/calendar/meeting-workspaces/${workspaceId}`,
      body,
      undefined,
      workspaceContract,
    ),
  );
}

export function useAddCalendarMeetingContext() {
  return useWorkspaceMutation<{
    workspaceId: string;
    contextType: "ENTITY" | "DOCUMENT" | "MAIL" | "CHAT" | "RECORDING" | "TRANSCRIPT";
    sourceKey: string;
    sourceRecordId: string;
    sourceVersion?: string;
    locator?: Record<string, unknown>;
    sharedWithGuests?: boolean;
    consentStatus?: "NOT_REQUIRED" | "PENDING" | "GRANTED" | "WITHDRAWN";
    staleAt?: string | null;
    retentionUntil?: string | null;
  }>("add-context", ({ workspaceId, ...body }) =>
    apiClient.post<CalendarMeetingWorkspace>(
      `/calendar/meeting-workspaces/${workspaceId}/contexts`,
      body,
      undefined,
      workspaceContract,
    ),
  );
}

export function useUpdateCalendarMeetingContext() {
  return useWorkspaceMutation<{
    workspaceId: string;
    contextId: string;
    expectedVersion: number;
    sharedWithGuests?: boolean;
    consentStatus?: "NOT_REQUIRED" | "PENDING" | "GRANTED" | "WITHDRAWN";
    retentionUntil?: string | null;
    revoke?: boolean;
  }>("update-context", ({ workspaceId, contextId, ...body }) =>
    apiClient.patch<CalendarMeetingWorkspace>(
      `/calendar/meeting-workspaces/${workspaceId}/contexts/${contextId}`,
      body,
      undefined,
      workspaceContract,
    ),
  );
}

export function useAddCalendarMeetingNote() {
  return useWorkspaceMutation<{
    workspaceId: string;
    kind: "AGENDA" | "NOTE" | "DECISION";
    content: string;
    sharedWithGuests?: boolean;
    retentionUntil?: string | null;
  }>("add-note", ({ workspaceId, ...body }) =>
    apiClient.post<CalendarMeetingWorkspace>(
      `/calendar/meeting-workspaces/${workspaceId}/notes`,
      body,
      undefined,
      workspaceContract,
    ),
  );
}

export function useAddCalendarMeetingDraft() {
  return useWorkspaceMutation<{
    workspaceId: string;
    kind: "DECISION" | "FOLLOW_UP" | "ACTION";
    content: string;
    ownerMembershipId?: number | null;
    sharedWithGuests?: boolean;
    sourceCommand?: CalendarMeetingSourceCommand;
  }>("add-draft", ({ workspaceId, ...body }) =>
    apiClient.post<CalendarMeetingWorkspace>(
      `/calendar/meeting-workspaces/${workspaceId}/drafts`,
      body,
      undefined,
      workspaceContract,
    ),
  );
}

export function useReviewCalendarMeetingDraft() {
  return useWorkspaceMutation<{
    workspaceId: string;
    draftId: string;
    expectedVersion: number;
    decision: "PROPOSE" | "DECLINE";
    idempotencyKey?: string;
  }>("review-draft", ({ workspaceId, draftId, ...body }) =>
    apiClient.post<CalendarMeetingWorkspace>(
      `/calendar/meeting-workspaces/${workspaceId}/drafts/${draftId}/review`,
      body,
      undefined,
      workspaceContract,
    ),
  );
}

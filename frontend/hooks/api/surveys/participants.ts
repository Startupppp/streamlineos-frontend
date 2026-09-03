"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type ParticipantStatus =
  | "invited"
  | "delivered"
  | "opened"
  | "started"
  | "partial"
  | "completed"
  | "disqualified"
  | "bounced"
  | "unsubscribed"
  | "expired";

export interface SurveyParticipant {
  id: number;
  collectorId: number | null;
  userId: string | null;
  contactId: number | null;
  leadId: number | null;
  clientId: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: ParticipantStatus;
  metadata: Record<string, unknown>;
  invitedAt: string | null;
  openedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ListParticipantsParams {
  status?: ParticipantStatus;
  page?: number;
  pageSize?: number;
}

export interface ParticipantImportRow {
  name?: string;
  email?: string;
  phone?: string;
}

export function useParticipants(surveyId: number, params?: ListParticipantsParams) {
  return useGatedQuery("surveys:participants:view", {
    queryKey: queryKeys.surveys.participants(surveyId, params as Record<string, unknown>),
    queryFn: async ({ signal }) =>
      (await apiClient.get<OffsetPage<SurveyParticipant>>(`/surveys/${surveyId}/participants`, params as Record<string, unknown>, signal)).items,
    staleTime: 15_000,
  });
}

function useInvalidateParticipants(surveyId: number) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [...queryKeys.surveys.all, "participants", surveyId] });
}

export function useImportParticipants(surveyId: number) {
  const invalidate = useInvalidateParticipants(surveyId);
  return useAuthorizedMutation("surveys:participants:manage", {
    mutationKey: ["surveys", "participants", "import", surveyId] as const,
    mutationFn: (input: { collectorId?: number; participants: ParticipantImportRow[] }) =>
      apiClient.post<Array<{ id: number; accessToken: string | null }>>(`/surveys/${surveyId}/participants/import`, input),
    onSuccess: invalidate,
  });
}

export function useInviteParticipants(surveyId: number) {
  const invalidate = useInvalidateParticipants(surveyId);
  return useAuthorizedMutation("surveys:participants:manage", {
    mutationKey: ["surveys", "participants", "invite", surveyId] as const,
    mutationFn: (participantIds: number[]) =>
      apiClient.post<{ success: boolean; count: number }>(`/surveys/${surveyId}/participants/invite`, { participantIds }),
    onSuccess: invalidate,
  });
}

export function useRemindParticipants(surveyId: number) {
  const invalidate = useInvalidateParticipants(surveyId);
  return useAuthorizedMutation("surveys:participants:manage", {
    mutationKey: ["surveys", "participants", "remind", surveyId] as const,
    mutationFn: (participantIds: number[]) =>
      apiClient.post<{ success: boolean; remindable: number }>(`/surveys/${surveyId}/participants/remind`, { participantIds }),
    onSuccess: invalidate,
  });
}

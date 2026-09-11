"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type LiveSessionStatus = "draft" | "waiting" | "active" | "paused" | "ended";

export interface SurveyLiveSession {
  id: number;
  orgId: string;
  surveyId: number;
  versionId: number;
  hostUserId: string | null;
  hostMembershipId: number | null;
  sessionCode: string;
  status: LiveSessionStatus;
  currentQuestionId: number | null;
  startedAt: string | null;
  endedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface PublicLiveQuestion {
  id: number;
  questionKey: string;
  type: string;
  title: string;
  description: string | null;
  required: boolean;
  settings: Record<string, unknown>;
  choices: Array<{ id: number; choiceKey: string; label: string; value: string | null; score: number | null; sortOrder: number }>;
}

export interface PublicLiveSession {
  id: number;
  orgId: string;
  surveyId: number;
  versionId: number;
  hostUserId: string | null;
  hostMembershipId: number | null;
  sessionCode: string;
  status: LiveSessionStatus;
  currentQuestionId: number | null;
  startedAt: string | null;
  endedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  currentQuestion: PublicLiveQuestion | null;
}

const surveyLiveSessionRowC = lazyContract(() =>
  import("./survey-live-schema").then((m) => m.surveyLiveSessionRowContract),
);
const liveSessionResultsC = lazyContract(() =>
  import("./survey-live-schema").then((m) => m.liveSessionResultsContract),
);
const surveyPublicLiveSessionC = lazyContract(() =>
  import("./survey-live-schema").then((m) => m.surveyPublicLiveSessionContract),
);
const joinLiveSessionResultC = lazyContract(() =>
  import("./survey-live-schema").then((m) => m.joinLiveSessionResultContract),
);
const submitLiveAnswerC = lazyContract(() =>
  import("./survey-live-schema").then((m) => m.submitLiveAnswerContract),
);

export interface LiveSessionResults {
  participantCount: number;
  revealed: boolean;
  question: {
    responseCount: number;
    choiceDistribution: Array<{ choiceId: number; label: string; count: number; isCorrect: boolean }>;
  } | null;
}

const LIVE_POLL_INTERVAL = 2_000;

export function useCreateLiveSession(surveyId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("surveys:live:host", {
    mutationKey: ["surveys", "live", "create", surveyId] as const,
    mutationFn: () => apiClient.post<SurveyLiveSession>(`/surveys/${surveyId}/live-sessions`, {}, undefined, surveyLiveSessionRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.all }),
  });
}

export function useLiveSession(sessionId: number) {
  return useGatedQuery("surveys:live:host", {
    queryKey: knowledgeAndSurveysQueryKeys.surveys.liveSession(sessionId),
    queryFn: ({ signal }) => apiClient.get<SurveyLiveSession>(`/surveys/live-sessions/${sessionId}`, undefined, signal, surveyLiveSessionRowC),
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

export function useLiveSessionResults(sessionId: number) {
  return useGatedQuery("surveys:live:host", {
    queryKey: [...knowledgeAndSurveysQueryKeys.surveys.liveSession(sessionId), "results"],
    queryFn: ({ signal }) => apiClient.get<LiveSessionResults>(`/surveys/live-sessions/${sessionId}/results`, undefined, signal, liveSessionResultsC),
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

function useLiveSessionAction(action: "start" | "next" | "reveal" | "end") {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["surveys", "live", action] as const,
    mutationFn: (sessionId: number) => apiClient.post<SurveyLiveSession>(`/surveys/live-sessions/${sessionId}/${action}`, undefined, undefined, surveyLiveSessionRowC),
    onSuccess: (_, sessionId) => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.surveys.liveSession(sessionId) }),
  });
}

export function useStartLiveSession() {
  return useLiveSessionAction("start");
}
export function useNextQuestion() {
  return useLiveSessionAction("next");
}
export function useRevealResults() {
  return useLiveSessionAction("reveal");
}
export function useEndLiveSession() {
  return useLiveSessionAction("end");
}

export function usePublicLiveSession(sessionCode: string) {
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.surveys.publicLiveSession(sessionCode),
    queryFn: ({ signal }) => apiClient.get<PublicLiveSession>(`/public/surveys/live/${sessionCode}`, undefined, signal, surveyPublicLiveSessionC),
    enabled: Boolean(sessionCode),
    refetchInterval: LIVE_POLL_INTERVAL,
    retry: false,
  });
}

export function useJoinLiveSession(sessionCode: string) {
  return useMutation({
    mutationKey: ["surveys", "public", "live", "join", sessionCode] as const,
    mutationFn: (input: { name?: string; email?: string }) =>
      apiClient.post<{ participantToken: string }>(`/public/surveys/live/${sessionCode}/join`, input, undefined, joinLiveSessionResultC),
  });
}

export function useSubmitLiveAnswer(sessionCode: string) {
  return useMutation({
    mutationKey: ["surveys", "public", "live", "answer", sessionCode] as const,
    mutationFn: (input: { participantToken: string; questionId: number; answerValue?: unknown; choiceIds?: number[] }) =>
      apiClient.post<{ success: boolean }>(`/public/surveys/live/${sessionCode}/answer`, input, undefined, submitLiveAnswerC),
  });
}

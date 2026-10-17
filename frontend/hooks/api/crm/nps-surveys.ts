"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { NpsSurvey, NpsSurveyDetail } from "@/hooks/api/crm/nps-surveys-schema";
import type { NpsSurveyStatus } from "@/hooks/api/crm/nps";

const keys = knowledgeAndSurveysQueryKeys.nps;
const schema = () => import("@/hooks/api/crm/nps-surveys-schema");
const listLazy = lazyContract(() => schema().then((m) => m.npsSurveyListContract));
const createLazy = lazyContract(() => schema().then((m) => m.npsSurveyCreateContract));
const updateLazy = lazyContract(() => schema().then((m) => m.npsSurveyUpdateContract));
const statsLazy = lazyContract(() => schema().then((m) => m.npsStatsContract));
const detailLazy = lazyContract(() => schema().then((m) => m.npsSurveyDetailContract));
const deleteLazy = lazyContract(() => schema().then((m) => m.npsDeleteContract));

interface NpsSurveyInput {
  title: string;
  question: string;
}

interface UpdateNpsSurveyInput extends Partial<NpsSurveyInput> {
  surveyId: number;
  status?: NpsSurveyStatus;
}

export function useNpsSurveys() {
  return useGatedQuery("crm:clients:read", {
    queryKey: keys.list(),
    queryFn: ({ signal }) => apiClient.get("/customer-executive/nps", undefined, signal, listLazy),
    staleTime: 30_000,
  });
}

export function useNpsStats() {
  return useGatedQuery("crm:clients:read", {
    queryKey: keys.stats(),
    queryFn: ({ signal }) =>
      apiClient.get("/customer-executive/nps/stats", undefined, signal, statsLazy),
    staleTime: 30_000,
  });
}

/** One survey with its responses. `null` keeps the read idle until a survey is picked. */
export function useNpsSurvey(surveyId: number | null) {
  return useGatedQuery("crm:clients:read", {
    queryKey: keys.detail(surveyId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get(`/customer-executive/nps/${surveyId}`, undefined, signal, detailLazy),
    staleTime: 60_000,
    enabled: surveyId !== null,
  });
}

function patchList(qc: QueryClient, update: (surveys: NpsSurvey[]) => NpsSurvey[]) {
  qc.setQueryData<NpsSurvey[]>(keys.list(), (current) => (current ? update(current) : current));
}

/** The aggregate counts only active surveys; the client cannot recompute it. */
function markStatsStale(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: keys.stats(), exact: true, refetchType: "none" });
}

export function useCreateNpsSurvey() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:clients:manage", {
    mutationKey: ["crm", "nps", "create"],
    mutationFn: (input: NpsSurveyInput) =>
      apiClient.post("/customer-executive/nps", input, undefined, createLazy),
    onSuccess: (created) => patchList(qc, (surveys) => [created, ...surveys]),
  });
}

export function useUpdateNpsSurvey() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:clients:manage", {
    mutationKey: ["crm", "nps", "update"],
    mutationFn: ({ surveyId, ...input }: UpdateNpsSurveyInput) =>
      apiClient.patch(`/customer-executive/nps/${surveyId}`, input, undefined, updateLazy),
    onSuccess: (updated, input) => {
      // The PATCH response carries no response tallies, so keep the row's own.
      patchList(qc, (surveys) =>
        surveys.map((survey) => (survey.id === updated.id ? { ...survey, ...updated } : survey)),
      );
      qc.setQueryData<NpsSurveyDetail>(keys.detail(updated.id), (current) =>
        current ? { ...current, survey: updated } : current,
      );
      if (input.status !== undefined) markStatsStale(qc);
    },
  });
}

export function useDeleteNpsSurvey() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:clients:manage", {
    mutationKey: ["crm", "nps", "delete"],
    mutationFn: (surveyId: number) =>
      apiClient.delete(`/customer-executive/nps/${surveyId}`, undefined, undefined, deleteLazy),
    onSuccess: (_, surveyId) => {
      patchList(qc, (surveys) => surveys.filter((survey) => survey.id !== surveyId));
      qc.removeQueries({ queryKey: keys.detail(surveyId), exact: true });
      markStatsStale(qc);
    },
  });
}

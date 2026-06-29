"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type NpsSurveyStatus = "draft" | "active" | "closed";
type NpsCategory = "promoter" | "passive" | "detractor";

export interface NpsSurvey {
  id: number;
  orgId: string;
  title: string;
  question: string;
  status: NpsSurveyStatus;
  publicToken: string;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  responseCount: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number;
}

interface NpsResponse {
  id: number;
  orgId: string;
  surveyId: number;
  score: number;
  category: NpsCategory;
  comment: string | null;
  respondentName: string | null;
  respondentEmail: string | null;
  clientAccountId: number | null;
  createdAt: string | null;
}

interface NpsBreakdown {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}

interface NpsSurveyDetail {
  survey: Omit<NpsSurvey, "responseCount" | "promoters" | "passives" | "detractors" | "nps">;
  responses: NpsResponse[];
  breakdown: NpsBreakdown;
  nps: number;
}

interface NpsStats {
  activeSurveys: number;
  breakdown: NpsBreakdown;
  nps: number;
  trend: { category: NpsCategory; createdAt: string }[];
}

interface CreateNpsSurveyInput {
  title: string;
  question: string;
}

interface UpdateNpsSurveyInput {
  id: number;
  title?: string;
  question?: string;
  status?: NpsSurveyStatus;
}

interface PublicNpsSurvey {
  title: string;
  question: string;
  status: NpsSurveyStatus;
}

interface SubmitNpsResponseInput {
  score: number;
  comment?: string;
  name?: string;
  email?: string;
}

export function useNpsSurveys() {
  return useQuery({
    queryKey: queryKeys.nps.surveys(),
    queryFn: () => apiClient.get<NpsSurvey[]>("/customer-executive/nps"),
    staleTime: 30_000,
  });
}

export function useNpsSurvey(id: number) {
  return useQuery({
    queryKey: queryKeys.nps.survey(id),
    queryFn: () => apiClient.get<NpsSurveyDetail>(`/customer-executive/nps/${id}`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}

export function useNpsStats() {
  return useQuery({
    queryKey: queryKeys.nps.stats(),
    queryFn: () => apiClient.get<NpsStats>("/customer-executive/nps/stats"),
    staleTime: 60_000,
  });
}

export function useCreateNpsSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNpsSurveyInput) =>
      apiClient.post<NpsSurvey>("/customer-executive/nps", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.nps.all }),
  });
}

export function useUpdateNpsSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateNpsSurveyInput) =>
      apiClient.patch<NpsSurvey>(`/customer-executive/nps/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.nps.all }),
  });
}

export function useDeleteNpsSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/customer-executive/nps/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.nps.all }),
  });
}

export function usePublicNpsSurvey(token: string) {
  return useQuery({
    queryKey: queryKeys.nps.publicSurvey(token),
    queryFn: async () => {
      const data = await apiClient.get<{ survey: PublicNpsSurvey }>(`/public/nps/${token}`);
      return data.survey;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });
}

export function useSubmitNpsResponse(token: string) {
  return useMutation({
    mutationFn: (input: SubmitNpsResponseInput) =>
      apiClient.post<{ success: boolean }>(`/public/nps/${token}`, input),
  });
}

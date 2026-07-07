"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface CsatSourceReport {
  totalRequests: number;
  totalResponses: number;
  responseRate: number;
  averageScore: number | null;
}

export interface CrmCampaignCsat {
  totalSurveys: number;
  totalResponses: number;
  averageScore: number | null;
}

export interface GeneralSurveysCsatNote {
  excluded: true;
  reason: string;
}

export interface CsatReport extends CsatSourceReport {
  sources: {
    ticket: CsatSourceReport;
    crmCampaigns: CrmCampaignCsat | null;
    generalSurveys: GeneralSurveysCsatNote;
  };
}

export interface PublicCsatSurvey {
  id: number;
  ticketId: number;
  score: number | null;
  comment: string | null;
  respondedAt: string | null;
}

interface SubmitCsatResponseInput {
  score: number;
  comment?: string;
}

interface SubmitCsatResponseResult {
  success: true;
  score: number;
}

export function useCsatReport() {
  return useQuery({
    queryKey: queryKeys.supportCsat.report(),
    queryFn: () => apiClient.get<CsatReport>("/support/reports/csat"),
    staleTime: 60_000,
  });
}

export function usePublicCsatSurvey(token: string) {
  return useQuery({
    queryKey: queryKeys.supportCsat.survey(token),
    queryFn: () => apiClient.get<PublicCsatSurvey>(`/support/csat/${token}`),
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });
}

export function useSubmitCsatResponse(token: string) {
  return useMutation({
    mutationKey: ["supportCsat", "respond", token] as const,
    mutationFn: (input: SubmitCsatResponseInput) =>
      apiClient.post<SubmitCsatResponseResult>(`/support/csat/${token}`, input),
  });
}

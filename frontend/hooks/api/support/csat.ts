"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const csatReportContract = lazyContract(() =>
  import("@/hooks/api/support/support-csat-schema").then((m) => m.csatReportContract),
);
const csatByTokenContract = lazyContract(() =>
  import("@/hooks/api/support/support-csat-schema").then((m) => m.csatByTokenContract),
);
const csatSubmitResultContract = lazyContract(() =>
  import("@/hooks/api/support/support-csat-schema").then((m) => m.csatSubmitResultContract),
);

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
  return useGatedQuery("support:reports:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportCsat.report(),
    queryFn: ({ signal }) => apiClient.get("/support/reports/csat", undefined, signal, csatReportContract),
    staleTime: 60_000,
  });
}

export function usePublicCsatSurvey(token: string) {
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.supportCsat.survey(token),
    queryFn: ({ signal }) => apiClient.get(`/support/csat/${token}`, undefined, signal, csatByTokenContract),
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });
}

export function useSubmitCsatResponse(token: string) {
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["supportCsat", "respond", token] as const,
    mutationFn: (input: SubmitCsatResponseInput) =>
      apiClient.post<SubmitCsatResponseResult>(`/support/csat/${token}`, input, undefined, csatSubmitResultContract),
  });
}

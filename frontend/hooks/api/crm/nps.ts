"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { lazyContract } from "@/lib/api-envelope";

const publicNpsSurveyLazy = lazyContract(() =>
  import("@/hooks/api/crm/nps-schema").then((m) => m.publicNpsSurveyContract),
);

export type NpsSurveyStatus = "draft" | "active" | "closed";

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

export function usePublicNpsSurvey(token: string) {
  return useQuery({
    queryKey: queryKeys.nps.publicSurvey(token),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<{ survey: PublicNpsSurvey }>(`/public/nps/${token}`, undefined, signal, publicNpsSurveyLazy);
      return data.survey;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });
}

export function useSubmitNpsResponse(token: string) {
  return useMutation({
    mutationKey: ["nps", "respond"] as const,
    mutationFn: (input: SubmitNpsResponseInput) =>
      apiClient.post<{ success: boolean }>(`/public/nps/${token}`, input),
  });
}

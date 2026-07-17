"use client";

import { apiClient } from "@/lib/api-client";

export async function surveyAiSummarizeResponses(surveyId: number): Promise<{ summary: string }> {
  return apiClient.post<{ summary: string }>(`/ai/surveys/${surveyId}/summarize-responses`, {});
}

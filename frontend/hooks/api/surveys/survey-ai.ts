"use client";

import { streamAiText, type AiTextStreamResult } from "@/hooks/api/ai-text-stream";

export interface SurveyResponseSummaryRequest {
  surveyId: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

export function streamSurveyResponseSummary({
  surveyId,
  onToken,
  signal,
}: SurveyResponseSummaryRequest): Promise<AiTextStreamResult> {
  return streamAiText({
    path: `/ai/surveys/${surveyId}/summarize-responses/stream`,
    body: {},
    onToken,
    signal,
  });
}

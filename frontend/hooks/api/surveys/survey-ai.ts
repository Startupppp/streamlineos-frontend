"use client";

import { streamAiText, type AiTextStreamResult } from "@/hooks/api/ai-text-stream";

export interface SurveyResponseSummaryRequest {
  surveyId: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

/**
 * Streams. `POST /ai/surveys/:surveyId/summarize-responses/stream` is bodyless and carries
 * the same `surveys:ai:use` permission as its buffered sibling, so the surface gains partial
 * output and a working Stop without a contract change.
 *
 * The request is an object rather than positional arguments on purpose: the defect this
 * ticket exists to close was an `AbortSignal` that type-checked in the wrong slot.
 */
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

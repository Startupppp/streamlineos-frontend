"use client";

import { apiClient } from "@/lib/api-client";

interface PeriodSummaryResponse {
  narration: string;
  evidence: Record<string, unknown>;
}

export async function fetchTimesheetPeriodSummary(periodId: number): Promise<PeriodSummaryResponse> {
  return apiClient.post<PeriodSummaryResponse>(`/timesheets/periods/${periodId}/ai/summarize`);
}

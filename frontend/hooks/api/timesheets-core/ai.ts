"use client";

import { apiClient } from "@/lib/api-client";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

interface PeriodSummaryResponse {
  narration: string;
  evidence: Record<string, unknown>;
}

export async function fetchTimesheetPeriodSummary(periodId: number): Promise<PeriodSummaryResponse> {
  return apiClient.post<PeriodSummaryResponse>(`/timesheets/periods/${periodId}/ai/summarize`);
}

export interface AiTextDraftResponse {
  text: string;
  aiUsage?: AiUsageMeta | null;
}

export interface DescribeEntryInput {
  description: string;
  projectName?: string;
  ticketTitle?: string;
  hours?: number;
  billable?: boolean;
}

export async function describeTimesheetEntry(
  input: DescribeEntryInput,
): Promise<AiTextDraftResponse> {
  return apiClient.post<AiTextDraftResponse>("/timesheets/ai/describe-entry", input);
}

export interface BillingNarrativeInput {
  projectId?: number;
  startDate: string;
  endDate: string;
}

export async function generateBillingNarrative(
  input: BillingNarrativeInput,
): Promise<AiTextDraftResponse> {
  return apiClient.post<AiTextDraftResponse>("/timesheets/ai/billing-narrative", input);
}

export interface ReportsNarrativeInput {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export async function generateReportsNarrative(
  input: ReportsNarrativeInput,
): Promise<AiTextDraftResponse> {
  return apiClient.post<AiTextDraftResponse>("/timesheets/ai/reports-narrative", input);
}

export async function draftRejectionReason(
  periodId: number,
  note?: string,
): Promise<AiTextDraftResponse> {
  return apiClient.post<AiTextDraftResponse>(
    `/timesheets/periods/${periodId}/ai/rejection-reason`,
    { note },
  );
}

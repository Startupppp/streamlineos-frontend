"use client";

import { streamAiResult, type AiResultStreamOptions } from "@/hooks/api/ai-result-stream";
import { timesheetDraftSchema, timesheetSummarySchema } from "./ai-schema";
import type { z } from "zod";

export async function fetchTimesheetPeriodSummary(periodId: number, options?: AiResultStreamOptions) {
  return streamAiResult({ path: `/timesheets/periods/${periodId}/ai/summarize/stream`, schema: timesheetSummarySchema, ...options });
}

export type AiTextDraftResponse = z.infer<typeof timesheetDraftSchema>;

export interface DescribeEntryInput {
  description: string;
  projectName?: string;
  ticketTitle?: string;
  hours?: number;
  billable?: boolean;
}

export async function describeTimesheetEntry(
  input: DescribeEntryInput,
  options?: AiResultStreamOptions,
): Promise<AiTextDraftResponse> {
  return streamAiResult({ path: "/timesheets/ai/describe-entry/stream", body: input, schema: timesheetDraftSchema, ...options });
}

export interface BillingNarrativeInput {
  projectId?: number;
  startDate: string;
  endDate: string;
}

export async function generateBillingNarrative(
  input: BillingNarrativeInput,
  options?: AiResultStreamOptions,
): Promise<AiTextDraftResponse> {
  return streamAiResult({ path: "/timesheets/ai/billing-narrative/stream", body: input, schema: timesheetDraftSchema, ...options });
}

export interface ReportsNarrativeInput {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export async function generateReportsNarrative(
  input: ReportsNarrativeInput,
  options?: AiResultStreamOptions,
): Promise<AiTextDraftResponse> {
  return streamAiResult({ path: "/timesheets/ai/reports-narrative/stream", body: input, schema: timesheetDraftSchema, ...options });
}

export async function draftRejectionReason(
  periodId: number,
  note?: string,
  options?: AiResultStreamOptions,
): Promise<AiTextDraftResponse> {
  return streamAiResult({ path: `/timesheets/periods/${periodId}/ai/rejection-reason/stream`, body: { note }, schema: timesheetDraftSchema, ...options });
}

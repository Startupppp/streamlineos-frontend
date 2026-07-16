"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface MeetingPrepInput {
  eventId: string;
  includeCrmContext?: boolean;
  includeProjectContext?: boolean;
}

export interface AgendaCitation {
  id: string | number;
  title: string;
  snippet?: string;
}

export interface AgendaOutput {
  agenda: string;
  keyTopics: string[];
  suggestedDuration?: string;
  preparationNotes?: string;
  citations: AgendaCitation[];
}

export interface MeetingContextSummary {
  crmContext?: string;
  projectContext?: string;
}

export interface MeetingPrepResult {
  agenda: AgendaOutput;
  context: MeetingContextSummary;
  connectedIntegrations: boolean;
}

export interface MeetingFollowUpInput {
  eventId: string;
  meetingNotes?: string;
  actionItems?: string[];
}

export interface ActionItem {
  item: string;
  assignee?: string;
  dueDate?: string;
}

export interface MeetingFollowUpResult {
  subject: string;
  body: string;
  actionItems: ActionItem[];
  nextMeetingDate?: string;
}

export interface ProposeSendInput {
  eventId: string;
  followUpDraft: MeetingFollowUpResult;
  channel: string;
}

export interface ProposeSendResult {
  proposalId: string;
  token: string;
  expiresAt: string;
}

export interface ConfirmSendInput {
  token: string;
}

export interface ConfirmSendResult {
  executed: boolean;
  channel?: string;
  error?: string;
  message?: string;
}

export function useMeetingPrep() {
  return useMutation({
    mutationKey: ["ai", "meetings", "prep"],
    mutationFn: (input: MeetingPrepInput) =>
      apiClient.post<MeetingPrepResult>("/ai/meetings/prep", input),
  });
}

export function useMeetingFollowUp() {
  return useMutation({
    mutationKey: ["ai", "meetings", "follow-up"],
    mutationFn: (input: MeetingFollowUpInput) =>
      apiClient.post<MeetingFollowUpResult>("/ai/meetings/follow-up", input),
  });
}

export function useProposeMeetingSend() {
  return useMutation({
    mutationKey: ["ai", "meetings", "follow-up", "propose-send"],
    mutationFn: (input: ProposeSendInput) =>
      apiClient.post<ProposeSendResult>("/ai/meetings/follow-up/propose-send", input),
  });
}

export function useConfirmMeetingSend() {
  return useMutation({
    mutationKey: ["ai", "meetings", "follow-up", "confirm-send"],
    mutationFn: (input: ConfirmSendInput) =>
      apiClient.post<ConfirmSendResult>("/ai/meetings/follow-up/confirm-send", input),
  });
}

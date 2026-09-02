"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { TicketHandoffResult } from "@/types/projects/ai";
import type { TicketPriority } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface TicketSummaryResult {
  summary: string;
  keyPoints: string[];
  blockers: string[];
}

export interface TicketCommentsSummaryResult {
  summary: string;
  themes: string[];
  openQuestions: string[];
}

export interface TicketImproveDescriptionResult {
  description: string;
}

export interface TicketSuggestedSubtask {
  title: string;
}

export interface TicketSuggestSubtasksResult {
  subtasks: TicketSuggestedSubtask[];
}

export interface TicketSuggestedChecklistItem {
  text: string;
}

export interface TicketGenerateChecklistResult {
  title: string;
  items: TicketSuggestedChecklistItem[];
}

export interface TicketDraftInput {
  title?: string;
  description?: string;
}

export interface TicketSuggestTitleResult {
  title: string;
}

export interface TicketSuggestFieldsResult {
  priority: TicketPriority;
  points: number | null;
  labelIds: number[];
  labelNames: string[];
  rationale: string;
}

export function useTicketAiSummarize(projectId: number, ticketId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "summarize"],
    mutationFn: () =>
      apiClient.post<TicketSummaryResult>(
        `/ai/tickets/${projectId}/${ticketId}/summarize`,
      ),
  });
}

export function useTicketAiSummarizeComments(projectId: number, ticketId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "summarize-comments"],
    mutationFn: () =>
      apiClient.post<TicketCommentsSummaryResult>(
        `/ai/tickets/${projectId}/${ticketId}/summarize-comments`,
      ),
  });
}

export function useTicketAiImproveDescription(projectId: number, ticketId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "improve-description"],
    mutationFn: (input?: { draft?: string }) =>
      apiClient.post<TicketImproveDescriptionResult>(
        `/ai/tickets/${projectId}/${ticketId}/improve-description`,
        input ?? {},
      ),
  });
}

export function useTicketAiSuggestSubtasks(projectId: number, ticketId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "suggest-subtasks"],
    mutationFn: () =>
      apiClient.post<TicketSuggestSubtasksResult>(
        `/ai/tickets/${projectId}/${ticketId}/suggest-subtasks`,
      ),
  });
}

export function useTicketAiGenerateChecklist(projectId: number, ticketId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "generate-checklist"],
    mutationFn: () =>
      apiClient.post<TicketGenerateChecklistResult>(
        `/ai/tickets/${projectId}/${ticketId}/generate-checklist`,
      ),
  });
}

export function useTicketHandoff(projectId: number, ticketId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "handoff"],
    mutationFn: () =>
      apiClient.post<TicketHandoffResult>(`/ai/tickets/${projectId}/${ticketId}/handoff`),
  });
}

export function useTicketDraftSuggestTitle(projectId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", "draft", "ai", "suggest-title"],
    mutationFn: (input: TicketDraftInput) =>
      apiClient.post<TicketSuggestTitleResult>(
        `/ai/projects/${projectId}/tickets/draft/suggest-title`,
        input,
      ),
  });
}

export function useTicketDraftImproveDescription(projectId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", "draft", "ai", "improve-description"],
    mutationFn: (input: TicketDraftInput) =>
      apiClient.post<TicketImproveDescriptionResult>(
        `/ai/projects/${projectId}/tickets/draft/improve-description`,
        input,
      ),
  });
}

export function useTicketDraftSuggestFields(projectId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", "draft", "ai", "suggest-fields"],
    mutationFn: (input: TicketDraftInput) =>
      apiClient.post<TicketSuggestFieldsResult>(
        `/ai/projects/${projectId}/tickets/draft/suggest-fields`,
        input,
      ),
  });
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { TicketHandoffResult } from "@/types/projects/ai";

export interface TicketSummaryResult {
  summary: string;
  keyPoints: string[];
  blockers: string[];
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

export function useTicketAiSummarize(projectId: number, ticketId: number) {
  return useMutation({
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "summarize"],
    mutationFn: () =>
      apiClient.post<TicketSummaryResult>(
        `/ai/tickets/${projectId}/${ticketId}/summarize`,
      ),
  });
}

export function useTicketAiImproveDescription(projectId: number, ticketId: number) {
  return useMutation({
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "improve-description"],
    mutationFn: (input?: { draft?: string }) =>
      apiClient.post<TicketImproveDescriptionResult>(
        `/ai/tickets/${projectId}/${ticketId}/improve-description`,
        input ?? {},
      ),
  });
}

export function useTicketAiSuggestSubtasks(projectId: number, ticketId: number) {
  return useMutation({
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "suggest-subtasks"],
    mutationFn: () =>
      apiClient.post<TicketSuggestSubtasksResult>(
        `/ai/tickets/${projectId}/${ticketId}/suggest-subtasks`,
      ),
  });
}

export function useTicketHandoff(projectId: number, ticketId: number) {
  return useMutation({
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "handoff"],
    mutationFn: () =>
      apiClient.post<TicketHandoffResult>(`/ai/tickets/${projectId}/${ticketId}/handoff`),
  });
}

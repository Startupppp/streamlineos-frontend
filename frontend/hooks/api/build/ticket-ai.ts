"use client";

import { apiClient } from "@/lib/api-client";
import type { TicketHandoffResult } from "@/types/projects/ai";
import type { TicketPriority } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";

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
  return useAuthorizedMutation<TicketSummaryResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "summarize"],
      mutationFn: (input) =>
        apiClient.post<TicketSummaryResult>(`/ai/tickets/${projectId}/${ticketId}/summarize`, undefined, {
          signal: input?.signal,
        }),
    },
  );
}

export function useTicketAiSummarizeComments(projectId: number, ticketId: number) {
  return useAuthorizedMutation<TicketCommentsSummaryResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "summarize-comments"],
      mutationFn: (input) =>
        apiClient.post<TicketCommentsSummaryResult>(`/ai/tickets/${projectId}/${ticketId}/summarize-comments`, undefined, {
          signal: input?.signal,
        }),
    },
  );
}

type TicketImproveInput = { draft?: string } & AiAbortInput;

export function useTicketAiImproveDescription(projectId: number, ticketId: number) {
  return useAuthorizedMutation<
    TicketImproveDescriptionResult,
    Error,
    TicketImproveInput | void
  >("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "improve-description"],
    mutationFn: (input) => {
      const { signal, ...body } = input ?? {};
      return apiClient.post<TicketImproveDescriptionResult>(
        `/ai/tickets/${projectId}/${ticketId}/improve-description`,
        body,
        { signal },
      );
    },
  });
}

export function useTicketAiSuggestSubtasks(projectId: number, ticketId: number) {
  return useAuthorizedMutation<TicketSuggestSubtasksResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "suggest-subtasks"],
      mutationFn: (input) =>
        apiClient.post<TicketSuggestSubtasksResult>(`/ai/tickets/${projectId}/${ticketId}/suggest-subtasks`, undefined, {
          signal: input?.signal,
        }),
    },
  );
}

export function useTicketAiGenerateChecklist(projectId: number, ticketId: number) {
  return useAuthorizedMutation<TicketGenerateChecklistResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "generate-checklist"],
      mutationFn: (input) =>
        apiClient.post<TicketGenerateChecklistResult>(`/ai/tickets/${projectId}/${ticketId}/generate-checklist`, undefined, {
          signal: input?.signal,
        }),
    },
  );
}

export function useTicketHandoff(projectId: number, ticketId: number) {
  return useAuthorizedMutation<TicketHandoffResult, Error, AiAbortInput | void>(
    "build:ai:use",
    {
      mutationKey: ["projects", projectId, "tickets", ticketId, "ai", "handoff"],
      mutationFn: (input) =>
        apiClient.post<TicketHandoffResult>(
          `/ai/tickets/${projectId}/${ticketId}/handoff`,
          undefined,
          { signal: input?.signal },
        ),
    },
  );
}

export function useTicketDraftSuggestTitle(projectId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", "draft", "ai", "suggest-title"],
    mutationFn: ({ signal, ...input }: TicketDraftInput & AiAbortInput) =>
      apiClient.post<TicketSuggestTitleResult>(`/ai/projects/${projectId}/tickets/draft/suggest-title`, input, {
        signal,
      }),
  });
}

export function useTicketDraftImproveDescription(projectId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", "draft", "ai", "improve-description"],
    mutationFn: ({ signal, ...input }: TicketDraftInput & AiAbortInput) =>
      apiClient.post<TicketImproveDescriptionResult>(`/ai/projects/${projectId}/tickets/draft/improve-description`, input, {
        signal,
      }),
  });
}

export function useTicketDraftSuggestFields(projectId: number) {
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", projectId, "tickets", "draft", "ai", "suggest-fields"],
    mutationFn: ({ signal, ...input }: TicketDraftInput & AiAbortInput) =>
      apiClient.post<TicketSuggestFieldsResult>(`/ai/projects/${projectId}/tickets/draft/suggest-fields`, input, {
        signal,
      }),
  });
}

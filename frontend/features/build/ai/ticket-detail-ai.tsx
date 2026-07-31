"use client";

import { useCallback, useMemo, useState } from "react";
import { useCan } from "@/hooks/api/access";
import {
  useAiInlineAction,
  type AiActionResult,
  type AiInlineSession,
} from "@/components/ai";
import {
  useTicketAiSummarize,
  useTicketAiSummarizeComments,
  useTicketAiImproveDescription,
  useTicketHandoff,
} from "@/hooks/api/build/ticket-ai";
import type { Ticket } from "@/types/projects";
import {
  getPlainText,
  formatTicketSummary,
  formatCommentsSummary,
  formatHandoff,
} from "./ticket-ai-formatters";

export { TicketDetailAiDescription } from "./ticket-detail-ai-description";
export { TicketDetailAiActivityActions } from "./ticket-detail-ai-activity";
export { TicketAiSuggestSubtasksAction } from "./ticket-ai-suggest-subtasks";
export { TicketAiGenerateChecklistAction } from "./ticket-ai-generate-checklist";

interface UseTicketDetailAiOptions {
  projectId: number;
  ticketId: number;
  ticket: Ticket;
  localTitle: string;
  commentCount: number;
  onApplyDescription: (html: string) => void;
}

export function useTicketDetailAi({
  projectId,
  ticketId,
  ticket,
  localTitle,
  commentCount,
  onApplyDescription,
}: UseTicketDetailAiOptions) {
  const canUseAI = useCan("build:ai:use");
  const [descriptionInlineSession, setDescriptionInlineSession] =
    useState<AiInlineSession | null>(null);

  const summarizeMutation = useTicketAiSummarize(projectId, ticketId);
  const summarizeCommentsMutation = useTicketAiSummarizeComments(projectId, ticketId);
  const improveMutation = useTicketAiImproveDescription(projectId, ticketId);
  const handoffMutation = useTicketHandoff(projectId, ticketId);

  const titlePlain = localTitle.trim();
  const descriptionPlain = getPlainText(ticket.description);

  const summarizeDisabledReason =
    titlePlain.length === 0 && descriptionPlain.length === 0 && commentCount === 0
      ? "Add a title, description, or comment first"
      : undefined;

  const improveDescriptionDisabledReason =
    titlePlain.length === 0 && descriptionPlain.length === 0
      ? "Add a title or description first"
      : undefined;

  const generateChecklistDisabledReason = improveDescriptionDisabledReason;

  const summarizeCommentsDisabledReason =
    commentCount === 0 ? "Add a comment first" : undefined;

  const runSummarize = useCallback((): Promise<AiActionResult> => {
    return summarizeMutation.mutateAsync(undefined).then(formatTicketSummary);
  }, [summarizeMutation]);

  const runSummarizeComments = useCallback((): Promise<AiActionResult> => {
    return summarizeCommentsMutation.mutateAsync(undefined).then(formatCommentsSummary);
  }, [summarizeCommentsMutation]);

  const runImprove = useCallback((): Promise<AiActionResult> => {
    return improveMutation
      .mutateAsync({ draft: ticket.description ?? undefined })
      .then((data) => ({ text: data.description }));
  }, [improveMutation, ticket.description]);

  const runHandoff = useCallback((): Promise<AiActionResult> => {
    return handoffMutation.mutateAsync(undefined).then(formatHandoff);
  }, [handoffMutation]);

  const descriptionAction = useAiInlineAction({
    actionKey: "improve-description",
    run: runImprove,
    onApply: onApplyDescription,
    onSessionChange: setDescriptionInlineSession,
  });

  return useMemo(
    () => ({
      canUseAI,
      summarizeDisabledReason,
      improveDescriptionDisabledReason,
      generateChecklistDisabledReason,
      summarizeCommentsDisabledReason,
      runSummarize,
      runSummarizeComments,
      runHandoff,
      descriptionInlineSession,
      descriptionTrigger: {
        label: "Improve",
        showLabel: true,
        disabledReason: improveDescriptionDisabledReason,
        isPending: descriptionAction.isPending || improveMutation.isPending,
        onClick: descriptionAction.run,
      },
    }),
    [
      canUseAI,
      summarizeDisabledReason,
      improveDescriptionDisabledReason,
      generateChecklistDisabledReason,
      summarizeCommentsDisabledReason,
      runSummarize,
      runSummarizeComments,
      runHandoff,
      descriptionInlineSession,
      descriptionAction.isPending,
      descriptionAction.run,
      improveMutation.isPending,
    ],
  );
}

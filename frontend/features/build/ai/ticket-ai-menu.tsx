"use client";

import { useCallback, useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import { AiActionsMenu, type AiAction, type AiActionResult } from "@/components/ai";
import {
  useTicketAiSummarize,
  useTicketAiImproveDescription,
  useTicketAiSuggestSubtasks,
  useTicketHandoff,
  type TicketSummaryResult,
} from "@/hooks/api/build/ticket-ai";
import type { TicketHandoffResult } from "@/types/projects/ai";

function formatSummary(data: TicketSummaryResult): AiActionResult {
  const lines: string[] = [data.summary];
  if (data.keyPoints.length > 0) {
    lines.push("", "Key points:");
    for (const p of data.keyPoints) lines.push(`• ${p}`);
  }
  if (data.blockers.length > 0) {
    lines.push("", "Blockers:");
    for (const b of data.blockers) lines.push(`• ${b}`);
  }
  return { text: lines.join("\n").trimEnd() };
}

function formatSubtasks(data: { subtasks: Array<{ title: string }> }): AiActionResult {
  if (data.subtasks.length === 0) return { text: "No subtask suggestions at this time." };
  const lines = data.subtasks.map((s, i) => `${i + 1}. ${s.title}`);
  return { text: lines.join("\n") };
}

function formatHandoff(data: TicketHandoffResult): AiActionResult {
  const lines: string[] = [data.currentState];
  if (data.keyDecisions.length > 0) {
    lines.push("", "Key decisions:");
    for (const d of data.keyDecisions) lines.push(`• ${d}`);
  }
  lines.push("", `Next action: ${data.nextAction}`);
  if (data.blockers.length > 0) {
    lines.push("", "Blockers:");
    for (const b of data.blockers) lines.push(`• ${b}`);
  }
  const citations = data.citations.map((c, i) => ({ id: i, title: c.excerpt }));
  return { text: lines.join("\n").trimEnd(), citations: citations.length > 0 ? citations : undefined };
}

interface TicketAiMenuProps {
  projectId: number;
  ticketId: number;
  currentDescription?: string | null;
  onApplyDescription?: (html: string) => void;
  asSubmenu?: boolean;
}

export function TicketAiMenu({
  projectId,
  ticketId,
  currentDescription,
  onApplyDescription,
  asSubmenu = false,
}: TicketAiMenuProps) {
  const canUseAI = useCan("build:ai:use");
  const summarizeMutation = useTicketAiSummarize(projectId, ticketId);
  const improveMutation = useTicketAiImproveDescription(projectId, ticketId);
  const subtasksMutation = useTicketAiSuggestSubtasks(projectId, ticketId);
  const handoffMutation = useTicketHandoff(projectId, ticketId);

  const runSummarize = useCallback((): Promise<AiActionResult> => {
    return summarizeMutation.mutateAsync(undefined).then(formatSummary);
  }, [summarizeMutation]);

  const runImprove = useCallback((): Promise<AiActionResult> => {
    return improveMutation
      .mutateAsync({ draft: currentDescription ?? undefined })
      .then((d) => ({ text: d.description }));
  }, [improveMutation, currentDescription]);

  const runSubtasks = useCallback((): Promise<AiActionResult> => {
    return subtasksMutation.mutateAsync(undefined).then(formatSubtasks);
  }, [subtasksMutation]);

  const runHandoff = useCallback((): Promise<AiActionResult> => {
    return handoffMutation.mutateAsync(undefined).then(formatHandoff);
  }, [handoffMutation]);

  const actions: AiAction[] = useMemo(() => [
    { key: "summarize", label: "Summarize", description: "Key points, blockers, current state", run: runSummarize, surface: "popover" },
    {
      key: "improve-description",
      label: "Improve description",
      description: "AI-polished version, draft first",
      run: runImprove,
      onApply: onApplyDescription,
      applyLabel: "Apply description",
      surface: "popover",
    },
    { key: "suggest-subtasks", label: "Suggest subtasks", description: "Breakdown into actionable steps", run: runSubtasks, surface: "popover" },
    { key: "handoff", label: "Handoff summary", description: "State, decisions, next action", run: runHandoff, surface: "sheet" },
  ], [runSummarize, runImprove, runSubtasks, runHandoff, onApplyDescription]);

  if (!canUseAI) return null;

  return (
    <AiActionsMenu
      actions={actions}
      triggerLabel="AI"
      menuLabel="Ticket AI"
      align="end"
      asSubmenu={asSubmenu}
    />
  );
}

"use client";

import {
  AiFieldPopoverAction,
  type AiActionResult,
} from "@/components/ai";

interface TicketDetailAiActivityProps {
  canUseAI: boolean;
  summarizeCommentsDisabledReason?: string;
  runSummarizeComments: () => Promise<AiActionResult>;
  runHandoff: () => Promise<AiActionResult>;
}

export function TicketDetailAiActivityActions({
  canUseAI,
  summarizeCommentsDisabledReason,
  runSummarizeComments,
  runHandoff,
}: TicketDetailAiActivityProps) {
  if (!canUseAI) return null;

  return (
    <div className="ml-auto flex items-center gap-1">
      <AiFieldPopoverAction
        label="Summarize comments"
        showLabel
        popoverTitle="Comments summary"
        disabledReason={summarizeCommentsDisabledReason}
        run={runSummarizeComments}
      />
      <AiFieldPopoverAction
        label="Handoff"
        showLabel
        popoverTitle="Handoff brief"
        run={runHandoff}
      />
    </div>
  );
}

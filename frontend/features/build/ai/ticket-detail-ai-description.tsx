"use client";

import {
  AiFieldTrigger,
  AiFieldPopoverAction,
  AiInlinePreview,
  type AiActionResult,
  type AiInlineSession,
} from "@/components/ai";

interface TicketDetailAiDescriptionProps {
  canUseAI: boolean;
  summarizeDisabledReason?: string;
  runSummarize: () => Promise<AiActionResult>;
  descriptionTrigger: {
    label: string;
    showLabel?: boolean;
    disabledReason?: string;
    isPending: boolean;
    onClick: () => void;
  };
  descriptionInlineSession: AiInlineSession | null;
}

export function TicketDetailAiDescription({
  canUseAI,
  summarizeDisabledReason,
  runSummarize,
  descriptionTrigger,
  descriptionInlineSession,
}: TicketDetailAiDescriptionProps) {
  if (!canUseAI) return null;

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-dense font-medium uppercase tracking-wide text-muted-foreground">
          Description
        </h3>
        <div className="flex items-center gap-1">
          <AiFieldPopoverAction
            label="Summarize"
            showLabel
            popoverTitle="Ticket summary"
            disabledReason={summarizeDisabledReason}
            run={runSummarize}
          />
          <AiFieldTrigger {...descriptionTrigger} />
        </div>
      </div>
      {descriptionInlineSession ? (
        <AiInlinePreview
          session={descriptionInlineSession}
          applyLabel="Replace"
          previewMode="description"
          className="mb-2"
        />
      ) : null}
    </>
  );
}

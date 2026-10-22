"use client";

import { useState } from "react";
import { CircleCheck, CircleX, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  FEEDBACK_NOTE_MIN,
  FEEDBACK_NOTE_MAX,
  VERDICTS_REQUIRING_NOTE,
  useSubmitInventoryAiFeedback,
  type InvAiSurface,
  type InvAiVerdict,
} from "@/hooks/api/inventory/ai-review";


export interface AiAnswerProvenance {
  promptKey: string;
  promptVersion: number;
  contractVersion: number;
  correlationId: string;
  model: string;
}

interface AiAnswerFeedbackProps {
  surface: InvAiSurface;
  provenance: AiAnswerProvenance | null;
  evidenceHash?: string | null;
  className?: string;
}

const VERDICTS: ReadonlyArray<{
  verdict: InvAiVerdict;
  label: string;
  hint: string;
  Icon: typeof CircleCheck;
  iconClass: string;
}> = [
  {
    verdict: "USEFUL",
    label: "Useful",
    hint: "This answered the question.",
    Icon: CircleCheck,
    iconClass: "text-status-success-ink",
  },
  {
    verdict: "WRONG",
    label: "Wrong",
    hint: "A figure or a claim here is not correct.",
    Icon: CircleX,
    iconClass: "text-status-danger-ink",
  },
  {
    verdict: "STALE",
    label: "Stale",
    hint: "This was right when it was computed and is not any more.",
    Icon: Clock,
    iconClass: "text-status-warning-ink",
  },
  {
    verdict: "UNSAFE",
    label: "Unsafe",
    hint: "This suggested something an operator should not do.",
    Icon: ShieldAlert,
    iconClass: "text-status-danger-ink",
  },
];

export function AiAnswerFeedback({
  surface,
  provenance,
  evidenceHash,
  className,
}: AiAnswerFeedbackProps) {
  const submit = useSubmitInventoryAiFeedback();
  const [pending, setPending] = useState<InvAiVerdict | null>(null);
  const [note, setNote] = useState("");
  const [filed, setFiled] = useState<InvAiVerdict | null>(null);

  if (!provenance) return null;

  function fileVerdict(verdict: InvAiVerdict, withNote?: string): void {
    if (!provenance) return;
    submit.mutate(
      {
        surface,
        verdict,
        correlationId: provenance.correlationId,
        promptKey: provenance.promptKey,
        promptVersion: provenance.promptVersion,
        contractVersion: provenance.contractVersion,
        ...(evidenceHash ? { evidenceHash } : {}),
        ...(withNote ? { note: withNote } : {}),
      },
      {
        onSuccess: () => {
          setFiled(verdict);
          setPending(null);
          setNote("");
        },
      },
    );
  }

  function handleVerdict(verdict: InvAiVerdict): void {
    if (VERDICTS_REQUIRING_NOTE.includes(verdict)) {
      setPending(verdict);
      return;
    }
    fileVerdict(verdict);
  }

  if (filed) {
    return (
      <p className={className}>
        <span className="text-micro text-muted-foreground">
          Recorded as “{filed.toLowerCase()}”. Thank you — it is linked to this
          answer&rsquo;s prompt version and model.
        </span>
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-micro text-muted-foreground">Was this answer</span>
        {VERDICTS.map(({ verdict, label, hint, Icon, iconClass }) => (
          <Tooltip key={verdict}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-micro"
                aria-label={`Mark this answer as ${label.toLowerCase()}`}
                disabled={submit.isPending}
                onClick={() => handleVerdict(verdict)}
              >
                <Icon className={`h-3 w-3 ${iconClass}`} aria-hidden="true" />
                {label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{hint}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {pending ? (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3">
          <label className="text-micro text-muted-foreground" htmlFor="ai-feedback-note">
            {pending === "UNSAFE"
              ? "What did it suggest that an operator should not do?"
              : "What was wrong, and what should it have said?"}
          </label>
          <Textarea
            id="ai-feedback-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={FEEDBACK_NOTE_MAX}
            placeholder="At least a sentence — a report nobody can act on is not feedback."
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-micro text-muted-foreground">
              {note.trim().length}/{FEEDBACK_NOTE_MIN} characters minimum
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setPending(null);
                setNote("");
              }}
            >
              Cancel
            </Button>
            <LoadingButton
              type="button"
              size="sm"
              isPending={submit.isPending}
              loadingText="Filing…"
              disabled={note.trim().length < FEEDBACK_NOTE_MIN}
              onClick={() => fileVerdict(pending, note.trim())}
            >
              File report
            </LoadingButton>
          </div>
        </div>
      ) : null}

      {submit.error ? (
        <p className="mt-1 text-micro text-status-danger-ink">
          {getErrorMessage(submit.error)}
        </p>
      ) : null}
    </div>
  );
}

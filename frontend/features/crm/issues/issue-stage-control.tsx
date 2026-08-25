"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEscalateIssue, useTransitionIssue } from "@/hooks/api/crm/issues";
import { getErrorMessage } from "@/lib/get-error-message";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  ISSUE_TRANSITION_STAGES,
  STAGE_LABELS,
  type IssueTransitionStage,
} from "@/types/crm/issues";

export interface IssueStageControlProps {
  issueRecordId: string;
  currentStage: string;
  canManage: boolean;
  canEscalate: boolean;
}

/**
 * The only way a stage moves.
 *
 * Deliberately not a field on the generated form. The description marks `stage`
 * read-only, so `formFields` drops it and the form is physically incapable of
 * moving one — which is what makes the ledger complete rather than a convention
 * somebody could edit around. Every move made here writes a row saying who and
 * why.
 *
 * Escalation is a separate control with a separate key, because raising a record
 * above its owner is a different authority from working it, and its reason is
 * required rather than optional: an escalation without one leaves the person it
 * lands on with an accusation and no case.
 */
export function IssueStageControl({
  issueRecordId,
  currentStage,
  canManage,
  canEscalate,
}: IssueStageControlProps) {
  const [target, setTarget] = useState<IssueTransitionStage | "">("");
  const [reason, setReason] = useState("");
  const [escalating, setEscalating] = useState(false);

  const transition = useTransitionIssue();
  const escalate = useEscalateIssue();

  function reset() {
    setTarget("");
    setReason("");
    setEscalating(false);
  }

  function handleTargetChange(value: string) {
    const stage = ISSUE_TRANSITION_STAGES.find((candidate) => candidate === value);
    setTarget(stage ?? "");
    setEscalating(false);
  }

  function handleMove() {
    if (!target) return;
    transition.mutate(
      { issueRecordId, toStage: target, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success(`Moved to ${STAGE_LABELS[target].toLowerCase()}`);
          reset();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleEscalate() {
    escalate.mutate(
      { issueRecordId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success("Escalated");
          reset();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleStartEscalation() {
    setEscalating(true);
    setTarget("");
  }

  if (!canManage && !canEscalate) return null;

  const isPending = transition.isPending || escalate.isPending;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-label font-medium text-muted-foreground">Move this on</h2>

      <div className="flex flex-wrap items-center gap-2">
        {canManage ? (
          <Select value={target} onValueChange={handleTargetChange}>
            <SelectTrigger className="w-fit min-w-[11rem]" aria-label="Move to stage">
              <SelectValue placeholder="Move to…" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              {ISSUE_TRANSITION_STAGES.filter((stage) => stage !== currentStage).map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {canEscalate && !escalating ? (
          <Button type="button" variant="outline" size="sm" onClick={handleStartEscalation}>
            Escalate
          </Button>
        ) : null}
      </div>

      {target || escalating ? (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              escalating
                ? "Why is this being raised above its owner? Required."
                : "Why (optional)"
            }
            aria-label="Reason"
          />
          <div className="grid grid-cols-2 gap-gap-field">
            <Button type="button" variant="outline" onClick={reset} disabled={isPending}>
              Cancel
            </Button>
            {escalating ? (
              <LoadingButton
                type="button"
                isPending={escalate.isPending}
                // A required reason is enforced here as well as at the boundary,
                // so the refusal is immediate rather than a round trip.
                disabled={reason.trim().length === 0}
                onClick={handleEscalate}
              >
                Escalate
              </LoadingButton>
            ) : (
              <LoadingButton
                type="button"
                isPending={transition.isPending}
                onClick={handleMove}
              >
                Move
              </LoadingButton>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

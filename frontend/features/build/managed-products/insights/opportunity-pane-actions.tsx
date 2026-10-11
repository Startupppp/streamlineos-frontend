"use client";

import { Calculator, CheckCircle2, FlaskConical, GitBranch, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OpportunityPaneActionsProps {
  allowedActions: string[];
  canStartValidating: boolean;
  isStartingValidation: boolean;
  onStartValidating: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onScore: () => void;
  onOverride: () => void;
}

export function OpportunityPaneActions({
  allowedActions,
  canStartValidating,
  isStartingValidation,
  onStartValidating,
  onAccept,
  onDecline,
  onScore,
  onOverride,
}: OpportunityPaneActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {canStartValidating && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onStartValidating}
          disabled={isStartingValidation}
          data-testid="start-validating-opportunity-btn"
        >
          <FlaskConical className="size-3.5" aria-hidden />
          {isStartingValidation ? "Starting…" : "Start validating"}
        </Button>
      )}
      {allowedActions.includes("accept") && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onAccept}
          data-testid="accept-opportunity-btn"
        >
          <CheckCircle2 className="size-3.5" aria-hidden />
          Accept
        </Button>
      )}
      {allowedActions.includes("decline") && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDecline}
          data-testid="decline-opportunity-btn"
        >
          <XCircle className="size-3.5" aria-hidden />
          Decline
        </Button>
      )}
      {allowedActions.includes("score") && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onScore}
            data-testid="score-opportunity-btn"
          >
            <Calculator className="size-3.5" aria-hidden />
            Score
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOverride}
            data-testid="override-score-btn"
          >
            <GitBranch className="size-3.5" aria-hidden />
            Override score
          </Button>
        </>
      )}
    </div>
  );
}

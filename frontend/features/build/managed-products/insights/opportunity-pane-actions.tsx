"use client";

import { Calculator, CheckCircle2, GitBranch, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OpportunityPaneActionsProps {
  allowedActions: string[];
  onAccept: () => void;
  onDecline: () => void;
  onScore: () => void;
  onOverride: () => void;
}

export function OpportunityPaneActions({
  allowedActions,
  onAccept,
  onDecline,
  onScore,
  onOverride,
}: OpportunityPaneActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
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
    </div>
  );
}

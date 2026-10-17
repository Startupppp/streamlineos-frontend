"use client";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiFieldPopoverFooter } from "./ai-field-popover-layout";
import type { AiActionResultState, AiActionResultStatus } from "./ai-action-result-body";

interface AiActionResultFooterProps {
  state: AiActionResultState;
  onApply?: () => void;
  applyLabel?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

const FOOTER_RETRY_STATUSES = new Set<AiActionResultStatus>([
  "error",
  "queued",
  "unavailable",
  "offline",
  "cancelled",
]);

export function AiActionResultFooter({
  state,
  onApply,
  applyLabel = "Apply",
  onRetry,
  onCancel,
}: AiActionResultFooterProps) {
  if ((state.status === "loading" || state.status === "streaming") && onCancel) {
    return (
      <AiFieldPopoverFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="h-9 w-full whitespace-nowrap text-sm"
        >
          Stop
        </Button>
      </AiFieldPopoverFooter>
    );
  }

  if (FOOTER_RETRY_STATUSES.has(state.status) && onRetry) {
    return (
      <AiFieldPopoverFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-9 w-full whitespace-nowrap text-sm"
        >
          Retry
        </Button>
      </AiFieldPopoverFooter>
    );
  }

  if (state.status === "ready" && onApply) {
    return (
      <AiFieldPopoverFooter>
        <LoadingButton
          size="sm"
          onClick={onApply}
          className="h-9 w-full whitespace-nowrap text-sm"
        >
          {applyLabel}
        </LoadingButton>
      </AiFieldPopoverFooter>
    );
  }

  return null;
}

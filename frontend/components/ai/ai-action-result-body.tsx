"use client";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDraftCard } from "./ai-draft-card";
import { AiQuotaEmptyState } from "./ai-quota-empty-state";
import { AiPermissionDenied } from "./ai-permission-denied";
import { AiFieldPopoverFooter } from "./ai-field-popover-layout";
import type { Citation } from "./ai-citation-chips";
import type { AiUsageMeta } from "./ai-usage-chip";

export interface AiActionResult {
  text: string;
  citations?: Citation[];
  confidence?: number;
  aiUsage?: AiUsageMeta | null;
}

export type AiActionResultState =
  | { status: "loading" }
  | { status: "ready"; result: AiActionResult; aiUsage?: AiUsageMeta | null }
  | { status: "quota" }
  | { status: "denied"; reason: string }
  | { status: "error"; message: string };

interface AiActionResultBodyProps {
  state: AiActionResultState;
  onApply?: () => void;
  applyLabel?: string;
  onRetry?: () => void;
  compact?: boolean;
  contentOnly?: boolean;
}

export function AiActionResultBody({
  state,
  onApply,
  applyLabel = "Apply",
  onRetry,
  compact = false,
  contentOnly = false,
}: AiActionResultBodyProps) {
  if (state.status === "loading") {
    return (
      <div className="space-y-2">
        <Skeleton className={compact ? "h-3 w-3/4" : "h-4 w-3/4"} />
        <Skeleton className={compact ? "h-3 w-full" : "h-4 w-full"} />
        <Skeleton className={compact ? "h-3 w-5/6" : "h-4 w-5/6"} />
      </div>
    );
  }

  if (state.status === "quota") {
    return <AiQuotaEmptyState variant={compact ? "compact" : "fill"} />;
  }

  if (state.status === "denied") {
    return <AiPermissionDenied reason={state.reason} />;
  }

  if (state.status === "error") {
    if (contentOnly) {
      return <p className="text-sm text-muted-foreground">{state.message}</p>;
    }

    return (
      <div className="flex flex-col items-start gap-3 py-3">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="h-8 text-xs">
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <AiDraftCard
      citations={state.result.citations}
      confidence={state.result.confidence}
      usage={state.aiUsage}
      onAccept={contentOnly ? undefined : onApply}
      acceptLabel={applyLabel}
      hideFooter={contentOnly}
      className={compact ? "shadow-none" : undefined}
    >
      <p className="whitespace-pre-wrap text-label leading-relaxed text-foreground">
        {state.result.text}
      </p>
    </AiDraftCard>
  );
}

interface AiActionResultFooterProps {
  state: AiActionResultState;
  onApply?: () => void;
  applyLabel?: string;
  onRetry?: () => void;
}

export function AiActionResultFooter({
  state,
  onApply,
  applyLabel = "Apply",
  onRetry,
}: AiActionResultFooterProps) {
  if (state.status === "error" && onRetry) {
    return (
      <AiFieldPopoverFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-8 w-full text-xs"
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
          className="h-8 w-full text-xs"
        >
          {applyLabel}
        </LoadingButton>
      </AiFieldPopoverFooter>
    );
  }

  return null;
}

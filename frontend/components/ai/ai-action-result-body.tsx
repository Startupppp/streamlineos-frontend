"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDraftCard } from "./ai-draft-card";
import { AiQuotaEmptyState } from "./ai-quota-empty-state";
import { AiPermissionDenied } from "./ai-permission-denied";
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
}

export function AiActionResultBody({
  state,
  onApply,
  applyLabel = "Apply",
  onRetry,
  compact = false,
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
      onAccept={onApply}
      acceptLabel={applyLabel}
      className={compact ? "shadow-none" : undefined}
    >
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
        {state.result.text}
      </p>
    </AiDraftCard>
  );
}

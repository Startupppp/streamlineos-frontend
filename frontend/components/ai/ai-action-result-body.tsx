"use client";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDraftCard } from "./ai-draft-card";
import { AiDraftText } from "./ai-draft-text";
import { AiQuotaEmptyState } from "./ai-quota-empty-state";
import { AiPermissionDenied } from "./ai-permission-denied";
import {
  AiCancelledNotice,
  AiOfflineNotice,
  AiQueuedNotice,
  AiUnavailableNotice,
} from "./ai-state-notices";
import { AiCancelledOutput, AiStreamingOutput } from "./ai-partial-output";
import { AiFieldPopoverFooter } from "./ai-field-popover-layout";
import type { AiFailureState } from "./ai-error-state";
import type { Citation } from "./ai-citation-chips";
import type { AiUsageMeta } from "./ai-usage-chip";

export interface AiActionResult {
  text: string;
  citations?: Citation[];
  confidence?: number;
  aiUsage?: AiUsageMeta | null;
}

export type AiActionResultState =
  | { status: "loading"; attempt?: number }
  | { status: "streaming"; text: string }
  | { status: "ready"; result: AiActionResult; aiUsage?: AiUsageMeta | null }
  | AiFailureState;

export type AiActionResultStatus = AiActionResultState["status"];

interface AiActionResultBodyProps {
  state: AiActionResultState;
  onApply?: () => void;
  applyLabel?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  compact?: boolean;
  contentOnly?: boolean;
  /** Declared by the action; gates the streaming citation placeholder. */
  expectsCitations?: boolean;
}

export function AiActionResultBody({
  state,
  onApply,
  applyLabel = "Apply",
  onRetry,
  onCancel,
  compact = false,
  contentOnly = false,
  expectsCitations = false,
}: AiActionResultBodyProps) {
  const noticeVariant = compact ? "compact" : "fill";

  if (state.status === "loading") {
    return (
      <div className="space-y-2" role="status" aria-live="polite" aria-busy>
        {isRetryAttempt(state.attempt) ? (
          <p className="text-dense text-muted-foreground">
            {retryingLabel(state.attempt)}
          </p>
        ) : null}
        <Skeleton className={compact ? "h-3 w-3/4" : "h-4 w-3/4"} />
        <Skeleton className={compact ? "h-3 w-full" : "h-4 w-full"} />
        <Skeleton className={compact ? "h-3 w-5/6" : "h-4 w-5/6"} />
        {onCancel && !contentOnly ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 text-xs text-muted-foreground"
          >
            Stop
          </Button>
        ) : null}
      </div>
    );
  }

  if (state.status === "streaming") {
    return (
      <AiStreamingOutput
        text={state.text}
        onCancel={contentOnly ? undefined : onCancel}
        variant={noticeVariant}
        expectsCitations={expectsCitations}
        embedded={contentOnly}
      />
    );
  }

  if (state.status === "quota") {
    return <AiQuotaEmptyState variant={noticeVariant} />;
  }

  if (state.status === "denied") {
    return <AiPermissionDenied reason={state.reason} />;
  }

  if (state.status === "queued") {
    return (
      <AiQueuedNotice
        message={state.message}
        variant={noticeVariant}
        onRetry={contentOnly ? undefined : onRetry}
      />
    );
  }

  if (state.status === "unavailable") {
    return (
      <AiUnavailableNotice
        message={state.message}
        variant={noticeVariant}
        onRetry={contentOnly ? undefined : onRetry}
      />
    );
  }

  if (state.status === "offline") {
    return (
      <AiOfflineNotice
        message={state.message}
        variant={noticeVariant}
        onRetry={contentOnly ? undefined : onRetry}
      />
    );
  }

  if (state.status === "cancelled") {
    if (state.text)
      return (
        <AiCancelledOutput
          text={state.text}
          onRetry={contentOnly ? undefined : onRetry}
          variant={noticeVariant}
          embedded={contentOnly}
        />
      );

    return (
      <AiCancelledNotice
        variant={noticeVariant}
        onRetry={contentOnly ? undefined : onRetry}
      />
    );
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

  if (contentOnly) {
    return <AiDraftText text={state.result.text} />;
  }

  return (
    <AiDraftCard
      citations={state.result.citations}
      confidence={state.result.confidence}
      usage={state.aiUsage ?? state.result.aiUsage}
      onAccept={onApply}
      acceptLabel={applyLabel}
      hideFooter={false}
      className={compact ? "shadow-none" : undefined}
    >
      <AiDraftText text={state.result.text} />
    </AiDraftCard>
  );
}

interface AiActionResultFooterProps {
  state: AiActionResultState;
  onApply?: () => void;
  applyLabel?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

function isRetryAttempt(attempt: number | undefined): boolean {
  return attempt !== undefined && attempt > 1;
}

function retryingLabel(attempt: number | undefined): string {
  return attempt === undefined ? "Retrying…" : `Retrying — attempt ${attempt}`;
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

"use client";

import DOMPurify from "isomorphic-dompurify";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiQuotaEmptyState } from "./ai-quota-empty-state";
import { AiPermissionDenied } from "./ai-permission-denied";
import {
  AiCancelledNotice,
  AiOfflineNotice,
  AiQueuedNotice,
  AiUnavailableNotice,
} from "./ai-state-notices";
import { AiUsageChip } from "./ai-usage-chip";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { AiActionResultState } from "./ai-action-result-body";
import { cn } from "@/lib/utils";

export interface AiInlineSession {
  actionKey: string;
  state: AiActionResultState;
  apply: () => void;
  reject: () => void;
  retry: () => void;
  cancel: () => void;
}

type AiInlinePreviewMode = "title" | "description" | "fields";

interface AiInlinePreviewProps {
  session: AiInlineSession;
  applyLabel?: string;
  previewMode?: AiInlinePreviewMode;
  className?: string;
}

export function AiInlinePreview({
  session,
  applyLabel = "Replace",
  previewMode = "fields",
  className,
}: AiInlinePreviewProps) {
  const { state } = session;
  const usage = state.status === "ready" ? (state.aiUsage ?? state.result.aiUsage) : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
        className,
      )}
    >
      {state.status === "loading" && (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={session.cancel}
            className="h-7 text-xs text-muted-foreground"
          >
            Stop
          </Button>
        </div>
      )}

      {state.status === "quota" && <AiQuotaEmptyState variant="compact" />}

      {state.status === "denied" && <AiPermissionDenied reason={state.reason} />}

      {state.status === "queued" && (
        <AiQueuedNotice message={state.message} variant="compact" onRetry={session.retry} />
      )}

      {state.status === "unavailable" && (
        <AiUnavailableNotice message={state.message} variant="compact" onRetry={session.retry} />
      )}

      {state.status === "offline" && (
        <AiOfflineNotice message={state.message} variant="compact" onRetry={session.retry} />
      )}

      {state.status === "cancelled" && (
        <AiCancelledNotice variant="compact" onRetry={session.retry} />
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-muted-foreground">{state.message}</p>
          <Button type="button" variant="outline" size="sm" onClick={session.retry} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          {previewMode === "title" ? (
            <TruncatedText
              text={state.result.text}
              className="text-label font-medium leading-snug text-foreground"
            />
          ) : previewMode === "description" ? (
            <div
              className="max-h-32 overflow-y-auto text-xs leading-relaxed text-foreground [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(state.result.text) }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
              {state.result.text}
            </p>
          )}
          {usage ? (
            <div className="mt-2">
              <AiUsageChip usage={usage} />
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-1.5">
            <LoadingButton size="sm" onClick={session.apply} className="h-7 text-xs">
              {applyLabel}
            </LoadingButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={session.reject}
              className="h-7 text-xs text-muted-foreground"
            >
              Reject
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

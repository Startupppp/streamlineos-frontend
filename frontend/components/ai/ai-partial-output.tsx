"use client";

import { StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiDraftCard } from "./ai-draft-card";
import { cn } from "@/lib/utils";

type OutputVariant = "compact" | "fill";

interface AiStreamingOutputProps {
  text: string;
  onCancel?: () => void;
  variant?: OutputVariant;
  className?: string;
  /**
   * Whether THIS surface will deliver sources when the answer lands.
   *
   * The shimmer used to be unconditional, so a "Loading sources" placeholder
   * appeared on every streaming AI action and then resolved to nothing on all
   * but two of them — measured over the corpus, 26 of the 28 files that define
   * an `AiAction` never return a `citations` field at all. A placeholder that
   * always resolves to nothing is not a loading state, it is a promise the
   * product does not keep, so it is opt-in and defaults to off.
   */
  expectsCitations?: boolean;
}

export function AiStreamingOutput({
  text,
  onCancel,
  variant = "fill",
  className,
  expectsCitations = false,
}: AiStreamingOutputProps) {
  return (
    <AiDraftCard citationsPending={expectsCitations} className={cn(variant === "compact" && "shadow-none", className)}>
      <div role="status" aria-live="polite" aria-busy>
        <p
          className={cn(
            "whitespace-pre-wrap leading-relaxed text-foreground",
            variant === "compact" ? "text-xs" : "text-label",
          )}
        >
          {text}
          <span
            aria-hidden
            className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 bg-foreground motion-safe:animate-pulse"
          />
        </p>
        <p className="mt-2 text-dense text-muted-foreground">Generating…</p>
      </div>
      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="mt-2 h-7 text-xs text-muted-foreground"
        >
          Stop
        </Button>
      ) : null}
    </AiDraftCard>
  );
}

interface AiCancelledOutputProps {
  text: string;
  onRetry?: () => void;
  variant?: OutputVariant;
  className?: string;
}

export function AiCancelledOutput({
  text,
  onRetry,
  variant = "fill",
  className,
}: AiCancelledOutputProps) {
  return (
    <AiDraftCard className={cn(variant === "compact" && "shadow-none", className)}>
      <div role="status" aria-live="polite">
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <StopCircle className="h-3.5 w-3.5" aria-hidden />
          Stopped — partial answer kept
        </p>
        <p
          className={cn(
            "mt-1.5 whitespace-pre-wrap leading-relaxed text-foreground",
            variant === "compact" ? "text-xs" : "text-label",
          )}
        >
          {text}
        </p>
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 h-7 text-xs"
        >
          Run again
        </Button>
      ) : null}
    </AiDraftCard>
  );
}

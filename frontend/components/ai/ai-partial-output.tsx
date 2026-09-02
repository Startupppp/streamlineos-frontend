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
}

export function AiStreamingOutput({
  text,
  onCancel,
  variant = "fill",
  className,
}: AiStreamingOutputProps) {
  return (
    <AiDraftCard citationsPending className={cn(variant === "compact" && "shadow-none", className)}>
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

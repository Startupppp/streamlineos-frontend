"use client";

import { StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiDraftCard } from "./ai-draft-card";
import { AiDraftText } from "./ai-draft-text";
import { cn } from "@/lib/utils";

type OutputVariant = "compact" | "fill";

interface AiStreamingOutputProps {
  text: string;
  onCancel?: () => void;
  variant?: OutputVariant;
  embedded?: boolean;
  className?: string;

  expectsCitations?: boolean;
}

export function AiStreamingOutput({
  text,
  onCancel,
  variant = "fill",
  embedded = false,
  className,
  expectsCitations = false,
}: AiStreamingOutputProps) {
  const body = (
    <div role="status" aria-live="polite" aria-busy>
      <AiDraftText
        text={text}
        className={variant === "compact" ? "text-xs" : undefined}
      />
      <span
        aria-hidden
        className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 bg-foreground motion-safe:animate-pulse"
      />
      <p className="mt-2 text-dense text-muted-foreground">Generating…</p>
      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="mt-2 h-9 text-sm text-muted-foreground"
        >
          Stop
        </Button>
      ) : null}
    </div>
  );

  if (embedded) return <div className={className}>{body}</div>;

  return (
    <AiDraftCard citationsPending={expectsCitations} className={cn(variant === "compact" && "shadow-none", className)}>
      {body}
    </AiDraftCard>
  );
}

interface AiCancelledOutputProps {
  text: string;
  onRetry?: () => void;
  variant?: OutputVariant;
  embedded?: boolean;
  className?: string;
}

export function AiCancelledOutput({
  text,
  onRetry,
  variant = "fill",
  embedded = false,
  className,
}: AiCancelledOutputProps) {
  const body = (
    <div role="status" aria-live="polite">
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <StopCircle className="h-3.5 w-3.5" aria-hidden />
        Stopped — partial answer kept
      </p>
      <AiDraftText
        text={text}
        className={cn("mt-1.5", variant === "compact" && "text-xs")}
      />
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 h-9 text-sm"
        >
          Run again
        </Button>
      ) : null}
    </div>
  );

  if (embedded) return <div className={className}>{body}</div>;

  return (
    <AiDraftCard className={cn(variant === "compact" && "shadow-none", className)}>
      {body}
    </AiDraftCard>
  );
}

"use client";

import type { ComponentType } from "react";
import { CloudOff, ServerCrash, StopCircle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NoticeVariant = "compact" | "fill";

interface AiStateNoticeProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  tone?: "muted" | "warning";
  variant?: NoticeVariant;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

const TONE_CLASS = {
  muted: "text-muted-foreground",
  warning: "text-status-warning-ink",
} as const;

export function AiStateNotice({
  icon: Icon,
  title,
  description,
  tone = "muted",
  variant = "fill",
  onRetry,
  retryLabel = "Try again",
  className,
}: AiStateNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-1.5 text-center",
        variant === "fill" ? "px-6 py-8" : "px-3 py-4",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4", TONE_CLASS[tone])} aria-hidden />
      <p className="text-xs font-medium text-foreground">{title}</p>
      {description ? (
        <p className="text-dense text-muted-foreground">{description}</p>
      ) : null}
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1 h-7 text-xs"
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

interface AiNoticeProps {
  message?: string;
  variant?: NoticeVariant;
  onRetry?: () => void;
  className?: string;
}

export function AiQueuedNotice({ message, variant, onRetry, className }: AiNoticeProps) {
  return (
    <AiStateNotice
      icon={Timer}
      tone="warning"
      title="AI is busy right now"
      description={
        message ?? "Your organisation has too many AI requests in flight. Nothing was charged."
      }
      variant={variant}
      onRetry={onRetry}
      className={className}
    />
  );
}

export function AiUnavailableNotice({ message, variant, onRetry, className }: AiNoticeProps) {
  return (
    <AiStateNotice
      icon={ServerCrash}
      tone="warning"
      title="AI is temporarily unavailable"
      description={message ?? "The provider is not responding. Nothing was charged."}
      variant={variant}
      onRetry={onRetry}
      className={className}
    />
  );
}

export function AiOfflineNotice({ message, variant, onRetry, className }: AiNoticeProps) {
  return (
    <AiStateNotice
      icon={CloudOff}
      title="You're offline"
      description={message ?? "Reconnect to use AI features."}
      variant={variant}
      onRetry={onRetry}
      className={className}
    />
  );
}

export function AiCancelledNotice({ variant, onRetry, className }: AiNoticeProps) {
  return (
    <AiStateNotice
      icon={StopCircle}
      title="Stopped"
      description="You stopped this request."
      variant={variant}
      onRetry={onRetry}
      retryLabel="Run again"
      className={className}
    />
  );
}

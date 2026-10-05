"use client";

import { AlertTriangle, RefreshCw, Lock, GitMerge, AlertCircle, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ErrorReference } from "@/components/shared/error-reference";
import { isApiError } from "@/lib/api-envelope";

export interface ErrorStateForStatus {
  title: string;
  description: string;
  retryable: boolean;
  icon: "conflict" | "denied" | "validation" | "unavailable" | "generic";
}

export function getErrorStateForStatus(error: unknown): ErrorStateForStatus {
  if (!isApiError(error)) {
    return {
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try again.",
      retryable: true,
      icon: "generic",
    };
  }
  if (error.status === 409) {
    return {
      title: "Conflict",
      description: "Someone else updated this record. Reload to see the latest version.",
      retryable: false,
      icon: "conflict",
    };
  }
  if (error.status === 403) {
    return {
      title: "Permission denied",
      description: "You don’t have permission to perform this action.",
      retryable: false,
      icon: "denied",
    };
  }
  if (error.status === 422) {
    return {
      title: "Validation failed",
      description: "Please check the highlighted fields and try again.",
      retryable: false,
      icon: "validation",
    };
  }
  if (error.status === 503 || error.status === 502) {
    return {
      title: "Service unavailable",
      description: "The service is temporarily unavailable. Please try again in a moment.",
      retryable: true,
      icon: "unavailable",
    };
  }
  return {
    title: "Something went wrong",
    description: "An error occurred. Please try again.",
    retryable: true,
    icon: "generic",
  };
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
  /** The failed call's error. When it carries a request id, a copyable reference line is shown under the message. */
  error?: unknown;
  autoMapStatus?: boolean;
}

const STATUS_ICONS = {
  conflict: GitMerge,
  denied: Lock,
  validation: AlertCircle,
  unavailable: ServerCrash,
  generic: AlertTriangle,
} as const;

export function ErrorState({
  title: titleProp,
  description: descriptionProp,
  onRetry: onRetryProp,
  className,
  compact = false,
  error,
  autoMapStatus = false,
}: ErrorStateProps) {
  const mapped = autoMapStatus ? getErrorStateForStatus(error) : null;
  const title = titleProp ?? mapped?.title ?? "Something went wrong";
  const description = descriptionProp ?? mapped?.description ?? "An error occurred while loading this data. Please try again.";
  const iconKey = mapped?.icon ?? "generic";
  const IconComponent = STATUS_ICONS[iconKey];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5",
        compact ? "py-8 px-4" : "min-h-0 w-full flex-1 py-14 px-6",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={cn(
          "rounded-lg bg-destructive/10 flex items-center justify-center mb-4",
          compact ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <IconComponent
          className={cn(
            "text-destructive",
            compact ? "h-5 w-5" : "h-6 w-6"
          )}
          aria-hidden
        />
      </div>

      <h2
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-sm"
        )}
      >
        {title}
      </h2>

      <p
        className={cn(
          "text-status-neutral-ink-strong mt-1 w-full min-w-0 max-w-xs break-words leading-relaxed [overflow-wrap:anywhere]",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </p>

      <ErrorReference error={error} className="mt-3" />

      {onRetryProp && (
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn("mt-4", compact && "h-7 text-xs")}
          onClick={onRetryProp}
        >
          <RefreshCw className={cn(compact ? "h-3 w-3 mr-1.5" : "h-4 w-4 mr-2")} aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}

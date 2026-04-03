"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-14 px-6",
        "rounded-xl border border-dashed border-border/60 bg-muted/20",
        className
      )}
    >
      {/* Icon / illustration */}
      {illustration ? (
        <div className={cn("mb-4", compact ? "mb-3" : "mb-5")}>{illustration}</div>
      ) : Icon ? (
        <div
          className={cn(
            "mb-4 rounded-xl bg-muted flex items-center justify-center",
            compact ? "h-10 w-10 mb-3" : "h-12 w-12 mb-5"
          )}
        >
          <Icon className={cn("text-muted-foreground/60", compact ? "h-5 w-5" : "h-6 w-6")} />
        </div>
      ) : null}

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-[0.9375rem]"
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-muted-foreground mt-1 max-w-xs leading-relaxed",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={cn("flex items-center gap-2", compact ? "mt-3" : "mt-5")}>
          {action && (
            <Button
              size={compact ? "sm" : "default"}
              onClick={action.onClick}
              className={compact ? "h-7 text-xs" : undefined}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              size={compact ? "sm" : "default"}
              onClick={secondaryAction.onClick}
              className={compact ? "h-7 text-xs" : undefined}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

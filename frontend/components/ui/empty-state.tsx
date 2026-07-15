"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import Link from "next/link";
import { StateIllustration, type StateIllustrationPreset } from "@/components/illustrations/state-illustration";

interface ActionProps {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  illustration?: React.ReactNode;
  illustrationPreset?: StateIllustrationPreset;
  /** Fixed illustration box size. Defaults to `sm` when compact, otherwise `md`. */
  illustrationSize?: "sm" | "md";
  title: string;
  description?: string;
  action?: ActionProps;
  secondaryAction?: ActionProps;
  className?: string;
  compact?: boolean;
}

function ActionButton({
  action,
  size,
  className,
  variant = "default",
}: {
  action: ActionProps;
  size: "sm" | "default";
  className?: string;
  variant?: "default" | "outline";
}) {
  if (action.href) {
    return (
      <Button asChild size={size} variant={variant} className={className}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button
      size={size}
      variant={variant}
      onClick={action.onClick}
      className={className}
    >
      {action.label}
    </Button>
  );
}

const ILLUSTRATION_BOX_CLASS: Record<"sm" | "md", string> = {
  sm: "mb-2 h-20 w-20",
  md: "mb-5 h-28 w-28",
};

export function EmptyState({
  illustration,
  illustrationPreset,
  illustrationSize,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const size = illustrationSize ?? (compact ? "sm" : "md");

  const visual = illustration ?? (
    illustrationPreset ? (
      <StateIllustration preset={illustrationPreset} className="h-full w-full" />
    ) : null
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact
          ? "py-4 px-2"
          : "min-h-0 w-full flex-1 py-12 px-6 rounded-lg border border-dashed border-border bg-card",
        className
      )}
    >
      {visual ? (
        <div
          className={cn(
            "flex items-center justify-center shrink-0",
            ILLUSTRATION_BOX_CLASS[size],
            "[&_img]:h-full [&_img]:w-full [&_img]:object-contain"
          )}
        >
          {visual}
        </div>
      ) : null}

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-[13px] leading-tight" : "text-[0.9375rem]"
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-muted-foreground mt-0.5 max-w-xs leading-snug",
            compact ? "text-[11px]" : "text-sm mt-1"
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={cn("flex items-center gap-2", compact ? "mt-2" : "mt-5")}>
          {action && (
            <ActionButton
              action={action}
              size={compact ? "sm" : "default"}
              variant={compact ? "outline" : "default"}
              className={compact ? "h-7 text-xs" : undefined}
            />
          )}
          {secondaryAction && (
            <ActionButton
              action={secondaryAction}
              size={compact ? "sm" : "default"}
              variant="outline"
              className={compact ? "h-7 text-xs" : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

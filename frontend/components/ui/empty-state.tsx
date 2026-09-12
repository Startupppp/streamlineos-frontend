"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import Link from "next/link";
import { StateIllustration, type StateIllustrationPreset } from "@/components/illustrations/state-illustration";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import type { PermissionGate } from "@/lib/rbac/permission-gate";

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
  actionVariant?: "default" | "outline";
  className?: string;
  compact?: boolean;
  /**
   * When true, one or more active filters are responsible for the empty result.
   * Renders "No results match your filters." and a "Clear filters" button
   * instead of the create action, suppressing the normal `action` prop.
   */
  filtersActive?: boolean;
  /**
   * Overrides the filtered-empty heading. Only used when `filtersActive` is true;
   * defaults to "No results match your filters."
   */
  filteredTitle?: string;
  /** Called when the user clicks "Clear filters". Required when `filtersActive` is true. */
  onClearFilters?: () => void;
  /**
   * The gate on the read this emptiness is claimed from.
   *
   * A refused read holds no rows for the same reason a finished one can hold
   * none, and a disabled TanStack query reports `isLoading: false` — so a
   * screen reaches its empty branch either way and asserts the stronger of the
   * two facts. Given the gate, an empty state refuses to make a claim it cannot
   * evidence and states the refusal instead. The four meanings are unchanged;
   * denial simply preempts them.
   */
  access?: PermissionGate;
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

const FILTERED_EMPTY_TITLE = "No results match your filters.";

const ILLUSTRATION_BOX_CLASS: Record<"sm" | "md", string> = {
  sm: "mb-2 h-24 w-24",
  md: "mb-5 h-40 w-40",
};

export function EmptyState({
  illustration,
  illustrationPreset,
  illustrationSize,
  title,
  description,
  action,
  secondaryAction,
  actionVariant,
  className,
  compact = false,
  filtersActive = false,
  filteredTitle,
  onClearFilters,
  access,
}: EmptyStateProps) {
  if (access?.denied) {
    return (
      <NoPermissionState
        permission={access.permission}
        className={className}
        compact={compact}
      />
    );
  }

  const size = illustrationSize ?? (compact ? "sm" : "md");

  // Always show an illustration — use explicit prop, preset, or a sensible default SVG
  const visual =
    illustration ?? (
      <StateIllustration
        preset={illustrationPreset ?? "default"}
        className="h-full w-full"
      />
    );

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact
          ? "py-4 px-2"
          : "h-full min-h-full w-full flex-1 py-12 px-6 rounded-xl border border-dashed border-border bg-card",
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

      <h2
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-label leading-tight" : "text-sm"
        )}
      >
        {filtersActive ? filteredTitle ?? FILTERED_EMPTY_TITLE : title}
      </h2>

      {description && (
        <p
          className={cn(
            "text-muted-foreground mt-0.5 max-w-xs leading-snug",
            compact ? "text-dense" : "text-sm mt-1"
          )}
        >
          {description}
        </p>
      )}

      {filtersActive ? (
        <div className={cn("flex items-center gap-2", compact ? "mt-2" : "mt-5")}>
          <Button
            type="button"
            size={compact ? "sm" : "default"}
            variant="outline"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        </div>
      ) : (action || secondaryAction) ? (
        <div className={cn("flex items-center gap-2", compact ? "mt-2" : "mt-5")}>
          {action && (
            <ActionButton
              action={action}
              size={compact ? "sm" : "default"}
              variant={actionVariant ?? (compact ? "outline" : "default")}
            />
          )}
          {secondaryAction && (
            <ActionButton
              action={secondaryAction}
              size={compact ? "sm" : "default"}
              variant="outline"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

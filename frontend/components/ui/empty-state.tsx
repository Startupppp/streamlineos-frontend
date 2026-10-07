"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import Link from "next/link";
import {
  StateIllustration,
  type StateIllustrationPreset,
} from "@/components/illustrations/state-illustration";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import type { PermissionGate } from "@/lib/rbac/permission-gate";
import { SURFACE_EMPTY } from "@/lib/ui-surface-chrome";

interface ActionProps {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  illustration?: React.ReactNode;
  illustrationPreset?: StateIllustrationPreset;
  illustrationSize?: "xs" | "sm" | "md";
  title?: string;
  description?: string;
  descriptionClassName?: string;
  action?: ActionProps;
  secondaryAction?: ActionProps;
  tertiaryAction?: ActionProps;
  actionVariant?: "default" | "outline";
  className?: string;
  compact?: boolean;
  bare?: boolean;
  height?: number;

  filtersActive?: boolean;

  filteredTitle?: string;
  onClearFilters?: () => void;

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

const ILLUSTRATION_BOX_CLASS: Record<"xs" | "sm" | "md", string> = {
  xs: "mb-1 size-10",
  sm: "mb-2 size-24",
  md: "mb-5 size-48 sm:size-56",
};

export function EmptyState({
  illustration,
  illustrationPreset,
  illustrationSize,
  title,
  description,
  descriptionClassName,
  action,
  secondaryAction,
  tertiaryAction,
  actionVariant,
  className,
  compact = false,
  bare = false,
  height,
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
  const visual = illustration ?? (
    <StateIllustration
      preset={illustrationPreset ?? "default"}
      className="h-full w-full"
    />
  );

  const headingText = filtersActive
    ? (filteredTitle ?? FILTERED_EMPTY_TITLE)
    : title;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-4 px-2" : bare ? "" : SURFACE_EMPTY,
        className,
      )}
      style={bare && height !== undefined ? { height } : undefined}
    >
      {visual ? (
        <div
          className={cn(
            "flex items-center justify-center shrink-0",
            ILLUSTRATION_BOX_CLASS[size],
            "[&_img]:h-full [&_img]:w-full [&_img]:object-contain",
          )}
        >
          {visual}
        </div>
      ) : null}

      {headingText !== undefined && (
        <h2
          className={cn(
            "font-medium text-foreground",
            compact ? "text-label leading-tight" : "text-sm",
          )}
        >
          {headingText}
        </h2>
      )}

      {description && (
        <p
          className={cn(
            "text-muted-foreground mt-0.5 leading-snug break-words",
            descriptionClassName,
            compact ? "text-dense max-w-xs" : "text-sm mt-1 max-w-md",
          )}
        >
          {description}
        </p>
      )}

      {filtersActive ? (
        <div
          className={cn("flex items-center gap-2", compact ? "mt-2" : "mt-5")}
        >
          <Button
            type="button"
            size={compact ? "sm" : "default"}
            variant="outline"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        </div>
      ) : action || secondaryAction || tertiaryAction ? (
        <div
          className={cn("flex items-center gap-2", compact ? "mt-2" : "mt-5")}
        >
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
          {tertiaryAction && (
            <ActionButton
              action={tertiaryAction}
              size={compact ? "sm" : "default"}
              variant="outline"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

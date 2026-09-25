"use client";

import type { ComponentProps } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

export type RecruitmentEmptyStateProps = ComponentProps<typeof EmptyState>;

/** Uniform empty-state illustrations across the recruitment hub. */
export function RecruitmentEmptyState({
  illustration,
  illustrationPreset = "person",
  illustrationSize,
  className,
  compact,
  ...props
}: RecruitmentEmptyStateProps) {
  const size = illustrationSize ?? (compact ? "sm" : "md");
  return (
    <EmptyState
      illustration={illustration}
      illustrationPreset={illustration ? undefined : illustrationPreset}
      illustrationSize={size}
      compact={compact}
      className={cn(!compact && CONTENT_FILL_PANEL, className)}
      {...props}
    />
  );
}

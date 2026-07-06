"use client";

import type { ComponentProps } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export type RecruitmentEmptyStateProps = ComponentProps<typeof EmptyState>;

/** Uniform empty-state illustrations across the recruitment hub. */
export function RecruitmentEmptyState({
  illustrationSize,
  ...props
}: RecruitmentEmptyStateProps) {
  const size = illustrationSize ?? (props.compact ? "sm" : "md");
  return <EmptyState illustrationSize={size} {...props} />;
}

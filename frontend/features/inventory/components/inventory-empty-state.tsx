"use client";

import type { ComponentProps } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

export type InventoryEmptyStateProps = ComponentProps<typeof EmptyState>;

export function InventoryEmptyState({
  illustrationSize = "sm",
  className,
  compact,
  ...props
}: InventoryEmptyStateProps) {
  return (
    <EmptyState
      illustrationSize={illustrationSize}
      compact={compact}
      className={cn(!compact && CONTENT_FILL_PANEL, className)}
      {...props}
    />
  );
}

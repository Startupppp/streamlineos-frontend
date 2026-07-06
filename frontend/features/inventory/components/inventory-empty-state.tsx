"use client";

import type { ComponentProps } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export type InventoryEmptyStateProps = ComponentProps<typeof EmptyState>;

/** Inventory empty states use a uniform small illustration size across all screens. */
export function InventoryEmptyState({
  illustrationSize = "sm",
  ...props
}: InventoryEmptyStateProps) {
  return <EmptyState illustrationSize={illustrationSize} {...props} />;
}

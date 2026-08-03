"use client";

import { EmptyState } from "@/components/ui/empty-state";

export function LocationView() {
  return (
    <EmptyState
      illustrationPreset="travel"
      illustrationSize="md"
      title="Location-based holidays not yet configured"
      description="Assign offices or regions to employees in Org settings to group holidays by location."
      compact
      className="rounded-lg border border-border bg-muted/20 py-10"
    />
  );
}

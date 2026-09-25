"use client";

import { EmptyDevicesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

export function AssetReturnsEmptyState({
  isAdmin,
  onOpenSheet,
}: {
  isAdmin: boolean;
  onOpenSheet: () => void;
}) {
  return (
    <EmptyState
      className="flex-1"
      illustration={<EmptyDevicesIllustration />}
      title="No asset returns tracked"
      description="Log an asset return when an employee returns company equipment."
      action={isAdmin ? { label: "Log Return", onClick: onOpenSheet } : undefined}
    />
  );
}

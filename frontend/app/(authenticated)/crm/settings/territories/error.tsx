"use client";

import { useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";

export default function TerritoriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const handleReset = useCallback(() => reset(), [reset]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <EmptyState
        illustration={<EmptyTargetIllustration />}
        title="Something went wrong"
        description={error.message ?? "Failed to load territories."}
        action={{ label: "Try again", onClick: handleReset }}
        className="border-0 bg-transparent"
      />
    </div>
  );
}

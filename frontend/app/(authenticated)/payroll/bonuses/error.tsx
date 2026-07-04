"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BonusesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Bonuses error"
      fallbackMessage="Failed to load bonuses. Please try again."
    />
  );
}

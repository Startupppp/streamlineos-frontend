"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectDecisionsError({
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
      title="Decisions log error"
      fallbackMessage="Failed to load the decisions log. Please try again."
    />
  );
}

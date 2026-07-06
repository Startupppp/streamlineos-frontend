"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function IncidentDetailError({
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
      title="Incident error"
      fallbackMessage="Failed to load this incident. Please try again."
    />
  );
}

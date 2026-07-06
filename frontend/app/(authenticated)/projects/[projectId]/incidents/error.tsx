"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function IncidentsError({
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
      title="Incidents error"
      fallbackMessage="Failed to load incidents for this project. Please try again."
    />
  );
}

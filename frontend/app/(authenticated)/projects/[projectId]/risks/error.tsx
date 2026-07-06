"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectRisksError({
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
      title="Risk register error"
      fallbackMessage="Failed to load the risk register. Please try again."
    />
  );
}

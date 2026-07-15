"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AllWorkError({
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
      title="All Work Error"
      fallbackMessage="Failed to load work items."
    />
  );
}

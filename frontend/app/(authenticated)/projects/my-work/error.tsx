"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MyWorkError({
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
      title="My Work Error"
      fallbackMessage="Failed to load your work."
    />
  );
}

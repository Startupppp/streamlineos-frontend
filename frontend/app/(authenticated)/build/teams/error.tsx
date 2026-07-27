"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TeamsError({
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
      title="Teams error"
      fallbackMessage="Failed to load teams. Please try again."
    />
  );
}

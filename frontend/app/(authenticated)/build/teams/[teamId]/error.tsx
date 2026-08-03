"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TeamDetailError({
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
      title="Team error"
      fallbackMessage="Failed to load this team. Please try again."
    />
  );
}

"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ChangeRequestsError({
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
      title="Change requests error"
      fallbackMessage="Failed to load change requests. Please try again."
    />
  );
}

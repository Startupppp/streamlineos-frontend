"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MembersError({
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
      title="Members error"
      fallbackMessage="Failed to load workspace members. Please try again."
    />
  );
}

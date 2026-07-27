"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectMeetingsError({
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
      title="Meetings error"
      fallbackMessage="Failed to load meetings. Please try again."
    />
  );
}

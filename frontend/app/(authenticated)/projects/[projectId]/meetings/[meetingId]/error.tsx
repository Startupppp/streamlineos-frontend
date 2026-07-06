"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectMeetingDetailError({
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
      title="Meeting error"
      fallbackMessage="Failed to load this meeting. Please try again."
    />
  );
}

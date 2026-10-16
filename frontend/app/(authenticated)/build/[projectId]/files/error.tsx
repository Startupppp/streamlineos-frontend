"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function FilesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      error={error}
      reset={reset}
      title="Couldn't load files"
      fallbackMessage="Failed to load files. Please try again or contact support."
    />
  );
}

"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrExitDetailError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Exit error"
      fallbackMessage="Failed to load this exit. Please try again."
    />
  );
}

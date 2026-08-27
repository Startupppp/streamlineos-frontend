"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function TimesheetExceptionsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Exceptions Error"
      fallbackMessage="Failed to load the exceptions queue. Please try again."
    />
  );
}

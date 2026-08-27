"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function ContingentError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Contingent Workforce Error"
      fallbackMessage="Failed to load contingent workforce data. Please try again."
    />
  );
}

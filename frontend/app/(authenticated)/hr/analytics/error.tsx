"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HranalyticsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="HR Analytics Error"
      fallbackMessage="Failed to load HR Analytics. Please try again."
    />
  );
}

"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HremailtemplatesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Email Templates Error"
      fallbackMessage="Failed to load Email Templates. Please try again."
    />
  );
}

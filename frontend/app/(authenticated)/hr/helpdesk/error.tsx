"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrEmployeeSupportError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Employee support error"
      fallbackMessage="Failed to load employee support. Please try again."
    />
  );
}

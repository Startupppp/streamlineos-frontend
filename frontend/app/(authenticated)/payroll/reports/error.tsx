"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function PayrollReportsError({
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
      title="Payroll reports error"
      fallbackMessage="Failed to load payroll reports. Please try again."
    />
  );
}

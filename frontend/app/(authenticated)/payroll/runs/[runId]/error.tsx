"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function PayrollRunDetailError({
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
      title="Payroll run error"
      fallbackMessage="Failed to load this payroll run. Please try again."
    />
  );
}

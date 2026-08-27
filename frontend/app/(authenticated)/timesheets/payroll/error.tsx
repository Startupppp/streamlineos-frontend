"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function TimesheetPayrollError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Payroll Error"
      fallbackMessage="Failed to load payroll data. Please try again."
    />
  );
}

"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function TimesheetOverdueError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Overdue Timesheets Error"
      fallbackMessage="Failed to load the overdue queue. Please try again."
    />
  );
}

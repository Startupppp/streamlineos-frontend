"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function CompensationPlanningError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Compensation Planning Error"
      fallbackMessage="Failed to load compensation planning. Please try again."
    />
  );
}

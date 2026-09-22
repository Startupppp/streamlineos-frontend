"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrfnfError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Final settlement error"
      fallbackMessage="Failed to load final settlements. Please try again."
    />
  );
}

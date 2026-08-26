"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrHelpdeskError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="HR Helpdesk Error"
      fallbackMessage="Failed to load HR Helpdesk. Please try again."
    />
  );
}

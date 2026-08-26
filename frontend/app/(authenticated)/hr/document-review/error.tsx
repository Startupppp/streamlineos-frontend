"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function DocumentReviewError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Document Review Error"
      fallbackMessage="Failed to load the document review dashboard. Please try again."
    />
  );
}

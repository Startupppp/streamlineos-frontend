"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function CrmdealsagingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Deal Aging Report Error"
      fallbackMessage="Failed to load Deal Aging Report. Please try again."
    />
  );
}

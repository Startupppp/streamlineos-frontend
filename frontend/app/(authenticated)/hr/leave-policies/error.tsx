"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function LeavePoliciesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Leave Policies Error"
      fallbackMessage="Failed to load leave policies. Please try again."
    />
  );
}

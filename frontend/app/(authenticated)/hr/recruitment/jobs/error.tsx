"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrrecruitmentjobsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Jobs Error"
      fallbackMessage="Failed to load Jobs. Please try again."
    />
  );
}

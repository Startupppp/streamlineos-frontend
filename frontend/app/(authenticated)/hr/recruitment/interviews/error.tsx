"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrrecruitmentinterviewsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Interviews Error"
      fallbackMessage="Failed to load Interviews. Please try again."
    />
  );
}

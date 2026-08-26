"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrrecruitmentpipelineError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Recruitment Pipeline Error"
      fallbackMessage="Failed to load Recruitment Pipeline. Please try again."
    />
  );
}

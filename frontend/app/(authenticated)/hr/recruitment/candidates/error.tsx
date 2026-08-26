"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrrecruitmentcandidatesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Candidates Error"
      fallbackMessage="Failed to load Candidates. Please try again."
    />
  );
}

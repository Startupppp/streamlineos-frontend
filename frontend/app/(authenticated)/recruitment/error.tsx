"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function RecruitmentError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ReportingRouteErrorBoundary {...props} title="Recruitment Error" fallbackMessage="Failed to load recruitment data." />;
}

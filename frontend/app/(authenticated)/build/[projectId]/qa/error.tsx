"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function QaError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ReportingRouteErrorBoundary {...props} title="QA Error" fallbackMessage="Failed to load QA." />;
}

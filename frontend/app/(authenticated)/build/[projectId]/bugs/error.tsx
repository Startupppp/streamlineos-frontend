"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function BugsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ReportingRouteErrorBoundary {...props} title="Bugs Error" fallbackMessage="Failed to load bugs." />;
}

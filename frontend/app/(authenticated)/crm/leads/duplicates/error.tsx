"use client";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";
export default function DuplicateLeadsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ReportingRouteErrorBoundary {...props} title="Duplicate Lead Detection Error" fallbackMessage="Failed to load duplicate lead scan. Please try again." />;
}

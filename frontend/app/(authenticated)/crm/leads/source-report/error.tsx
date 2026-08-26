"use client";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";
export default function LeadSourceReportError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ReportingRouteErrorBoundary {...props} title="Lead Source Report Error" fallbackMessage="Failed to load lead source report. Please try again." />;
}

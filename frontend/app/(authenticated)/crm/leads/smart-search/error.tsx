"use client";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";
export default function SmartLeadSearchError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ReportingRouteErrorBoundary {...props} title="Smart Lead Search Error" fallbackMessage="Failed to load the smart search. Please try again." />;
}

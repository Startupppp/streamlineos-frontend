"use client";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";
export default function WinLossError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ReportingRouteErrorBoundary {...props} title="Win/Loss Analysis Error" fallbackMessage="Failed to load win/loss analysis. Please try again." />;
}

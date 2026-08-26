"use client";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";
export default function WebhooksError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ReportingRouteErrorBoundary {...props} title="Webhooks Error" fallbackMessage="Failed to load webhooks. Please try again." />;
}

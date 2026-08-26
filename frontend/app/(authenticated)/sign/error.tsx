"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function SignError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="SignOS Error"
      fallbackMessage="Failed to load SignOS. Please try again."
    />
  );
}

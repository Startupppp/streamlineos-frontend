"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function HrbackgroundverificationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Background Verification Error"
      fallbackMessage="Failed to load Background Verification. Please try again."
    />
  );
}

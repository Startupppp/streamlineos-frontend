"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function SignError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Sign OS Error"
      fallbackMessage="Failed to load Sign OS. Please try again."
    />
  );
}

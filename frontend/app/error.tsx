"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      layout="fullscreen"
      title="Something went wrong"
      fallbackMessage="An unexpected error occurred. Please try refreshing the page."
    />
  );
}

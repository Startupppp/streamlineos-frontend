"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function PostInviteError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Could not finish joining"
      fallbackMessage="Your access could not be loaded. Please try again."
    />
  );
}

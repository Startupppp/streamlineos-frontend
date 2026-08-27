"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function ProjectError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Project error"
      fallbackMessage="Failed to load project. Please try again or contact support."
    />
  );
}

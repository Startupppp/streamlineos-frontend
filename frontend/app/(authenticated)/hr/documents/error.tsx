"use client";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ReportingRouteErrorBoundary error={error} reset={reset} />;
}

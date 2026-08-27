"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function PortfoliosError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ReportingRouteErrorBoundary {...props} title="Portfolios Error" fallbackMessage="Failed to load portfolios. Please try again." />;
}

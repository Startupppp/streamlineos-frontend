"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";
import { getErrorMessage } from "@/lib/get-error-message";

export default function CrmDealsForecastError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Deal Forecast Error"
      fallbackMessage={getErrorMessage(props.error)}
    />
  );
}

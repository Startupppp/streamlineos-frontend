"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CrmDealsForecastError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Deal Forecast Error"
      fallbackMessage="Failed to load Deal Forecast. Please try again."
    />
  );
}

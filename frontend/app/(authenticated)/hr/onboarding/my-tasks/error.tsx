"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function MyOnboardingTasksError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Onboarding Error"
      fallbackMessage="Failed to load your onboarding tasks."
    />
  );
}

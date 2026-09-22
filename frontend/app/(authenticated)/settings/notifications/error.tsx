"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function SettingsNotificationsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      {...props}
      title="Notifications Settings Error"
      fallbackMessage="Failed to load notification settings. Please try again."
    />
  );
}

"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TimesheetSettingsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Settings Error"
      fallbackMessage="Failed to load timesheet settings. Please try again."
    />
  );
}

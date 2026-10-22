"use client";

import { useCallback } from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const queryErrors = useQueryErrorResetBoundary();

  const handleReset = useCallback(() => {
    queryErrors.reset();
    reset();
  }, [queryErrors, reset]);

  return (
    <ReportingRouteErrorBoundary
      error={error}
      reset={handleReset}
      title="Calendar error"
      fallbackMessage="Failed to load the calendar. Please try again."
    />
  );
}

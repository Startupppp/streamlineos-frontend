"use client";

import { useCallback } from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

/**
 * `throwOnError` is configured on the provider for every read, so TanStack sets
 * `retryOnMount: false` on each of them while its error-reset boundary reports
 * "not reset". Nothing in the app ever resets it, so a React-level `reset()`
 * alone re-renders the calendar, finds the cached `error` state, refuses to
 * refetch and re-throws — "Try Again" with no request behind it. `reset()` on
 * the query error-reset boundary is the channel that clears that gate, and it
 * only touches the reads that failed rather than the whole cache.
 */
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

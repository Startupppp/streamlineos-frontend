"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollComponentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Payroll components error"
      fallbackMessage="Failed to load salary components. Please try again."
    />
  );
}

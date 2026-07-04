"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollRunDetailError({
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
      title="Payroll run error"
      fallbackMessage="Failed to load this payroll run. Please try again."
    />
  );
}

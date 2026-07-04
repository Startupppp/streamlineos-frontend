"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollRunsError({
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
      title="Payroll runs error"
      fallbackMessage="Failed to load payroll runs. Please try again."
    />
  );
}

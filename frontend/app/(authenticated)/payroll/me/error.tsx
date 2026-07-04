"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MyPayrollError({
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
      title="Payroll portal error"
      fallbackMessage="Failed to load your payroll data. Please try again."
    />
  );
}

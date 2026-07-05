"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollError({
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
      title="Payroll error"
      fallbackMessage="Something went wrong in Payroll. Please try again."
    />
  );
}

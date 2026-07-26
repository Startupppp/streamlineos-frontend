"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TeamPayrollError({
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
      title="Team payroll error"
      fallbackMessage="Failed to load team payroll. Please try again."
    />
  );
}

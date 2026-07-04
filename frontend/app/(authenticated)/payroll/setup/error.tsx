"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollSetupError({
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
      title="Payroll setup error"
      fallbackMessage="Failed to load payroll setup. Please try again."
    />
  );
}

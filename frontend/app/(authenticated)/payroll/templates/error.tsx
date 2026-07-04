"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollTemplatesError({
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
      title="Payroll templates error"
      fallbackMessage="Failed to load payroll templates. Please try again."
    />
  );
}

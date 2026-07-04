"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollSettingsError({
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
      title="Payroll settings error"
      fallbackMessage="Failed to load payroll settings. Please try again."
    />
  );
}

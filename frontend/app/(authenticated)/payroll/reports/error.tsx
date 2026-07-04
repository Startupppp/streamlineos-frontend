"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollReportsError({
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
      title="Payroll reports error"
      fallbackMessage="Failed to load payroll reports. Please try again."
    />
  );
}

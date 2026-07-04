"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayslipsError({
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
      title="Payslips error"
      fallbackMessage="Failed to load payslips. Please try again."
    />
  );
}

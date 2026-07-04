"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollEmployeesError({
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
      title="Salary profiles error"
      fallbackMessage="Failed to load salary profiles. Please try again."
    />
  );
}

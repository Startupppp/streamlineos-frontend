"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function EmployeeProfileError({
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
      title="Salary profile error"
      fallbackMessage="Failed to load this employee's salary profile. Please try again."
    />
  );
}

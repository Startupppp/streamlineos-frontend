"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SalaryStructuresError({
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
      title="Salary structures error"
      fallbackMessage="Failed to load salary structures. Please try again."
    />
  );
}

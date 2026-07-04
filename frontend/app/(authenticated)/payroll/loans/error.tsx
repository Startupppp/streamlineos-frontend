"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function LoansError({
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
      title="Loans error"
      fallbackMessage="Failed to load loans and advances. Please try again."
    />
  );
}

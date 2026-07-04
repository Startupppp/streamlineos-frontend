"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TaxesError({
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
      title="Tax & statutory error"
      fallbackMessage="Failed to load tax and statutory data. Please try again."
    />
  );
}

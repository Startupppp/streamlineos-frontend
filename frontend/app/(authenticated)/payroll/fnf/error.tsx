"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function FnfError({
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
      title="Full & final settlement error"
      fallbackMessage="Failed to load settlement data. Please try again."
    />
  );
}

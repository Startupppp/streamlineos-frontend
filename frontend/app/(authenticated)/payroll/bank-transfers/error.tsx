"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BankTransfersError({
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
      title="Bank transfers error"
      fallbackMessage="Failed to load bank transfers. Please try again."
    />
  );
}

"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PortalError({
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
      title="Portal error"
      fallbackMessage="Failed to load the client portal. Please try again."
    />
  );
}

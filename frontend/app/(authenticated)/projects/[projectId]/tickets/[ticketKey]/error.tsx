"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TicketDetailError({
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
      title="Ticket Error"
      fallbackMessage="Failed to load ticket details."
    />
  );
}

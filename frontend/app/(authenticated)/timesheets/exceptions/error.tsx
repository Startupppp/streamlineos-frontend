"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TimesheetExceptionsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Exceptions Error"
      fallbackMessage="Failed to load the exceptions queue. Please try again."
    />
  );
}

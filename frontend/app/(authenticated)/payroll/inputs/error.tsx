"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollInputsError({
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
      title="Attendance inputs error"
      fallbackMessage="Failed to load attendance inputs. Please try again."
    />
  );
}

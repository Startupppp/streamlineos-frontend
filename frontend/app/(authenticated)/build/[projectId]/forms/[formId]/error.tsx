"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function FormDetailError({
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
      title="Form error"
      fallbackMessage="Failed to load this form. Please try again."
    />
  );
}

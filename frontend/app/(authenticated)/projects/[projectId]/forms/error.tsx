"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectFormsError({
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
      title="Forms error"
      fallbackMessage="Failed to load project forms. Please try again."
    />
  );
}

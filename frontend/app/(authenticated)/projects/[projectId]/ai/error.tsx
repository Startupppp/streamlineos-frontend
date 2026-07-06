"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectAiError({
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
      title="AI Assistant error"
      fallbackMessage="Failed to load the AI Assistant. Please try again."
    />
  );
}

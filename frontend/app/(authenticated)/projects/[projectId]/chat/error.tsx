"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectChatError({
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
      title="Chat error"
      fallbackMessage="Failed to load project chat. Please try again."
    />
  );
}

"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function WorkflowError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Workflow error"
      fallbackMessage="Failed to load workflow configuration. Please try again."
    />
  );
}

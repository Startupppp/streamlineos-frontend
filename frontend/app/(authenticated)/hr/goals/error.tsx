"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function GoalsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Goals Error"
      fallbackMessage="Failed to load goals. Please try again."
    />
  );
}

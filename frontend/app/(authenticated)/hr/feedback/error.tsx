"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function FeedbackError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Feedback Error"
      fallbackMessage="Failed to load feedback. Please try again."
    />
  );
}

"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TeamTimeError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Team Time Error"
      fallbackMessage="Failed to load team time data. Please try again."
    />
  );
}

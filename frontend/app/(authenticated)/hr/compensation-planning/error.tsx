"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CompensationPlanningError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Compensation Planning Error"
      fallbackMessage="Failed to load compensation planning. Please try again."
    />
  );
}

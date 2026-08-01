"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ContingentError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Contingent Workforce Error"
      fallbackMessage="Failed to load contingent workforce data. Please try again."
    />
  );
}

"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrCasesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Cases Error"
      fallbackMessage="Failed to load employee relations data. Please try again."
    />
  );
}

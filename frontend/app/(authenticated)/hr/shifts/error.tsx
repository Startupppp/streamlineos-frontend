"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ShiftsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Shifts Error"
      fallbackMessage="Failed to load shifts data. Please try again."
    />
  );
}

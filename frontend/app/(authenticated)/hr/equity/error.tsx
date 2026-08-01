"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function EquityError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Equity Error"
      fallbackMessage="Failed to load equity data. Please try again."
    />
  );
}

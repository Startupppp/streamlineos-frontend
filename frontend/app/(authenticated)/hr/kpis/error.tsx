"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function KpisError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="KPIs Error"
      fallbackMessage="Failed to load KPIs data. Please try again."
    />
  );
}

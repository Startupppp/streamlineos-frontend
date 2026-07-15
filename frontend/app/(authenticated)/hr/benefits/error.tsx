"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BenefitsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Benefits Error"
      fallbackMessage="Failed to load benefits data. Please try again."
    />
  );
}

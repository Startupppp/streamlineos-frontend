"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function LegalHoldsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Legal Holds Error"
      fallbackMessage="Failed to load legal holds. Please try again."
    />
  );
}

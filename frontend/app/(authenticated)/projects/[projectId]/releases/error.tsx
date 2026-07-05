"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ReleasesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Releases error"
      fallbackMessage="Failed to load releases. Please try again or contact support."
    />
  );
}

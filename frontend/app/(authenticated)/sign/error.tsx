"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SignError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      {...props}
      title="SignOS Error"
      fallbackMessage="Failed to load SignOS. Please try again."
    />
  );
}

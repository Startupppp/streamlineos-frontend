"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BiometricError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Biometric Integration Error"
      fallbackMessage="Failed to load biometric data. Please try again."
    />
  );
}

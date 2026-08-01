"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrSafetyError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Safety Error"
      fallbackMessage="Failed to load health and safety data. Please try again."
    />
  );
}

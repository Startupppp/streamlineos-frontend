"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SetupOrgError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      fallbackMessage="Failed to load setup page. Please try again."
    />
  );
}

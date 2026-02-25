"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function OrgSelectionError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      fallbackMessage="Failed to load organizations. Please try again."
      layout="fullscreen"
    />
  );
}

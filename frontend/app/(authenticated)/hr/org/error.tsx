"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function OrgHubError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Organisation Error"
      fallbackMessage="Failed to load organisation data. Please try again."
    />
  );
}

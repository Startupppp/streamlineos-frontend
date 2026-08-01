"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function LeavePoliciesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Leave Policies Error"
      fallbackMessage="Failed to load leave policies. Please try again."
    />
  );
}

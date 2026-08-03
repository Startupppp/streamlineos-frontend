"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrHelpdeskError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="HR Helpdesk Error"
      fallbackMessage="Failed to load HR Helpdesk. Please try again."
    />
  );
}

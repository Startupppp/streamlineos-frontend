"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function WorkLogsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Work Logs Error"
      fallbackMessage="Failed to load work logs. Please try again."
    />
  );
}

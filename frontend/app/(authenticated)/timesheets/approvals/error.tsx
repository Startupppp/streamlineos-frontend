"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TimesheetApprovalsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Approvals Error"
      fallbackMessage="Failed to load the approval queue. Please try again."
    />
  );
}

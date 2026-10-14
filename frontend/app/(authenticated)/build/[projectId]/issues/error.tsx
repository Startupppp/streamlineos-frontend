"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function IssuesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { reset: resetQueryBoundary } = useQueryErrorResetBoundary();
  return (
    <ReportingRouteErrorBoundary
      {...props}
      reset={() => {
        resetQueryBoundary();
        props.reset();
      }}
      title="Issues error"
      fallbackMessage="Failed to load issues. Please try again."
    />
  );
}

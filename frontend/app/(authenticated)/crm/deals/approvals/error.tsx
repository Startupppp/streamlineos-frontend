"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
import { getErrorMessage } from "@/lib/get-error-message";

export default function CrmdealsapprovalsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Deal Approvals Error"
      fallbackMessage={getErrorMessage(props.error)}
    />
  );
}

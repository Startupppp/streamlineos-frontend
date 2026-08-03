"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function QaError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary {...props} title="QA Error" fallbackMessage="Failed to load QA." />;
}

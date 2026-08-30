"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { isChunkLoadError, reportError } from "@/lib/observability";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const extra: Record<string, unknown> = { route, digest: error.digest };
    if (isChunkLoadError(error)) extra.recoverable = true;
    reportError(error, extra);
  }, [error]);

  return <ErrorState title="Failed to load analytics" onRetry={reset} className="flex-1" />;
}

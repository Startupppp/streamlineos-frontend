"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RouteErrorBoundary, shouldReportRouteError } from "@/components/ui/route-error-boundary";
import { isChunkLoadError, reportError } from "@/lib/observability";

interface ReportingRouteErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  fallbackMessage?: string;
  layout?: "centered" | "inline" | "fullscreen";
}

export function ReportingRouteErrorBoundary({
  error,
  reset,
  ...rest
}: ReportingRouteErrorBoundaryProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const route =
      typeof window !== "undefined" ? window.location.pathname : undefined;
    const extra: Record<string, unknown> = { route, digest: error.digest };
    if (isChunkLoadError(error)) extra.recoverable = true;
    if (!shouldReportRouteError(error, route ?? "server")) return;
    reportError(error, extra);
  }, [error]);

  const handleBeforeReset = useCallback(() => {
    void queryClient.resetQueries({
      predicate: (query) => query.state.status === "error",
    });
  }, [queryClient]);

  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      onBeforeReset={handleBeforeReset}
      {...rest}
    />
  );
}

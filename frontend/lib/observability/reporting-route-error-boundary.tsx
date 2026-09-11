"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
import { reportError } from "./error-reporter";
import { isChunkLoadError } from "./chunk-load";

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
    reportError(error, extra);
  }, [error]);

  const handleBeforeReset = useCallback(() => {
    void queryClient.resetQueries();
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

"use client";

import { startTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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
    // reset() alone re-renders the client segment from the payload it already
    // has, so an error thrown on the server (an RSC access check during an
    // outage) came straight back on every retry until a full reload.
    startTransition(() => router.refresh());
  }, [queryClient, router]);

  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      onBeforeReset={handleBeforeReset}
      {...rest}
    />
  );
}

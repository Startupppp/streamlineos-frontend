"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (isChunkLoadError(error)) return;
    const route =
      typeof window !== "undefined" ? window.location.pathname : undefined;
    reportError(error, { route, digest: error.digest });
  }, [error]);

  return <RouteErrorBoundary error={error} reset={reset} {...rest} />;
}

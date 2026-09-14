"use client";

import { useCallback, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { isTransientNetworkError } from "@/lib/query-error-policy";

const networkRetryCount = new Map<string, number>();
const MAX_NETWORK_AUTO_RETRIES = 3;
const NETWORK_RETRY_DELAYS_MS: readonly [number, number, number] = [
  3_000, 6_000, 12_000,
];

interface RouteErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  onBeforeReset?: () => void;
  title?: string;
  fallbackMessage?: string;
  layout?: "centered" | "inline" | "fullscreen";
}

export function RouteErrorBoundary({
  error,
  reset,
  onBeforeReset,
  title,
  fallbackMessage = "An unexpected error occurred. Please try again.",
  layout = "inline",
}: RouteErrorBoundaryProps) {
  const headingId = useId();
  const isWholePage = layout === "fullscreen";
  const isNetwork = isTransientNetworkError(error);
  const networkKey = isNetwork ? error.message : null;

  const handleRetry = useCallback(() => {
    onBeforeReset?.();
    reset();
  }, [onBeforeReset, reset]);

  useEffect(() => {
    if (!networkKey) return;
    const count = networkRetryCount.get(networkKey) ?? 0;
    if (count >= MAX_NETWORK_AUTO_RETRIES) return;
    const delay = NETWORK_RETRY_DELAYS_MS[count] ?? 12_000;
    const timer = setTimeout(() => {
      networkRetryCount.set(networkKey, count + 1);
      handleRetry();
    }, delay);
    return () => clearTimeout(timer);
  }, [networkKey, handleRetry]);

  const autoRetryCount = networkKey !== null ? (networkRetryCount.get(networkKey) ?? 0) : 0;
  const isAutoRetrying = isNetwork && autoRetryCount < MAX_NETWORK_AUTO_RETRIES;

  const resolvedTitle = isNetwork
    ? "Server temporarily unavailable"
    : (title ?? "Something went wrong");

  const displayMessage = isAutoRetrying
    ? "The server is not responding. Retrying automatically…"
    : isNetwork
    ? "The server could not be reached. Please try again."
    : fallbackMessage;

  const content = (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 text-center"
    >
      <div className="bg-destructive/10 p-4 rounded-full">
        <AlertTriangle
          className="w-8 text-destructive"
          aria-hidden="true"
        />
      </div>
      <h1 id={headingId} className="text-xl font-bold text-foreground">
        {resolvedTitle}
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">{displayMessage}</p>
      {!isAutoRetrying && (
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try Again
        </Button>
      )}
    </div>
  );


  if (isWholePage)
    return (
      <main
        aria-labelledby={headingId}
        className="min-h-dvh w-full noir-mesh flex items-center justify-center p-4"
      >
        <div className="max-w-md">{content}</div>
      </main>
    );

  if (layout === "centered")
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center py-10">
        {content}
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-12">
      {content}
    </div>
  );
}

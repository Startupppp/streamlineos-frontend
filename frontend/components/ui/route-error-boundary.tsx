"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { isTransientNetworkError } from "@/lib/query-error-policy";

interface NetworkRetryBudget {
  readonly attempts: number;
  readonly lastAttemptAt: number;
}

const networkRetryBudgets = new Map<string, NetworkRetryBudget>();
export const MAX_NETWORK_AUTO_RETRIES = 3;
export const NETWORK_RETRY_BUDGET_TTL_MS = 60_000;
const NETWORK_RETRY_DELAYS_MS: readonly [number, number, number] = [
  3_000, 6_000, 12_000,
];

export function resetNetworkRetryBudgets(): void {
  networkRetryBudgets.clear();
}

function spentNetworkRetries(routeKey: string): number {
  const budget = networkRetryBudgets.get(routeKey);
  if (!budget) return 0;
  if (Date.now() - budget.lastAttemptAt > NETWORK_RETRY_BUDGET_TTL_MS) {
    networkRetryBudgets.delete(routeKey);
    return 0;
  }
  return budget.attempts;
}

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
  const [routeKey] = useState(() =>
    typeof window === "undefined" ? "server" : window.location.pathname,
  );
  const networkKey = isNetwork ? routeKey : null;

  const handleRetry = useCallback(() => {
    onBeforeReset?.();
    reset();
  }, [onBeforeReset, reset]);

  const retryRef = useRef(handleRetry);
  useLayoutEffect(() => {
    retryRef.current = handleRetry;
  });

  useEffect(() => {
    if (networkKey === null) return;
    const spent = spentNetworkRetries(networkKey);
    if (spent >= MAX_NETWORK_AUTO_RETRIES) return;
    const delay = NETWORK_RETRY_DELAYS_MS[spent] ?? 12_000;
    const timer = setTimeout(() => {
      networkRetryBudgets.set(networkKey, {
        attempts: spent + 1,
        lastAttemptAt: Date.now(),
      });
      retryRef.current();
    }, delay);
    return () => clearTimeout(timer);
  }, [networkKey]);

  const isAutoRetrying =
    networkKey !== null &&
    spentNetworkRetries(networkKey) < MAX_NETWORK_AUTO_RETRIES;

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

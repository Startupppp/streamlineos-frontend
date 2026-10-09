"use client";

import { LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { isTransientNetworkError } from "@/lib/query-error-policy";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";
import { ErrorState } from "./error-state";
import { NoPermissionState } from "./no-permission-state";
import { DeniedView, FeatureLockedView, QuotaExceededView } from "./page-state-views";
import type { GateStateProps } from "./page-state-shared";

const PAGE_STATE_CONTAINER =
  "flex min-h-0 min-w-0 w-full flex-1 flex-col";

function SessionExpiredState({ compact = false, className }: GateStateProps) {
  function handleSignInAgain() {
    window.location.assign(
      signInPathForMissingSession(window.location.pathname + window.location.search),
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="status"
      aria-label="Session expired"
    >
      <div
        className={cn(
          "rounded-2xl bg-muted flex items-center justify-center mb-4",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
      >
        <LogIn className={cn("text-muted-foreground", compact ? "w-5" : "w-7")} />
      </div>
      <h2 className={cn("font-semibold mb-1", compact ? "text-sm" : "text-base")}>
        Your session expired
      </h2>
      <p
        className={cn(
          "text-muted-foreground max-w-sm mb-4",
          compact ? "text-xs" : "text-sm",
        )}
      >
        You were signed out after a period of inactivity. Signing in again will bring you
        straight back here.
      </p>
      <Button
        size={compact ? "sm" : "default"}
        onClick={handleSignInAgain}
      >
        Sign in again
      </Button>
    </div>
  );
}

export interface PageStateProps {
  resolution: PageStateResolution;
  loading: ReactNode;
  empty?: ReactNode;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
  children: ReactNode;
}

export function PageState({
  resolution,
  loading,
  empty,
  onRetry,
  className,
  compact = false,
  children,
}: PageStateProps) {
  switch (resolution.kind) {
    case "loading":
      return (
        <div className={cn(PAGE_STATE_CONTAINER, className)}>
          {loading}
        </div>
      );
    case "denied":
    case "module-disabled":
    case "module-denied":
    case "plan-required":
      return (
        <DeniedView resolution={resolution} className={className} compact={compact} />
      );
    case "quota-exceeded":
      return (
        <QuotaExceededView
          limitKey={resolution.limitKey}
          used={resolution.used}
          limit={resolution.limit}
          upgradePath={resolution.upgradePath}
          onRetry={onRetry}
          className={className}
          compact={compact}
        />
      );
    case "feature-locked":
      return (
        <FeatureLockedView
          feature={resolution.feature}
          requiredPlan={resolution.requiredPlan}
          onRetry={onRetry}
          className={className}
          compact={compact}
        />
      );
    case "session-expired":
      return <SessionExpiredState className={className} compact={compact} />;
    case "not-found":
      return (
        <NoPermissionState
          title="Not found"
          description="This doesn't exist, or you don't have access to it."
          className={className}
          compact={compact}
        />
      );
    case "error":
      return (
        <ErrorState
          className={className}
          compact={compact}
          title={
            isTransientNetworkError(resolution.error)
              ? "Server temporarily unavailable"
              : undefined
          }
          description={getErrorMessage(resolution.error)}
          error={resolution.error}
          onRetry={onRetry}
        />
      );
    case "empty":
      return (
        <div className={cn(PAGE_STATE_CONTAINER, className)}>
          {empty ?? children}
        </div>
      );
    case "ready":
      return (
        <div className={cn(PAGE_STATE_CONTAINER, className)}>
          {children}
        </div>
      );
  }
}

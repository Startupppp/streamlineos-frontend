"use client";

import type { ReactNode } from "react";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { isTransientNetworkError } from "@/lib/query-error-policy";
import { ErrorState } from "./error-state";
import { DeniedView, FeatureLockedView, QuotaExceededView } from "./page-state-views";

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
        <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
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
      return <>{empty ?? children}</>;
    case "ready":
      return <>{children}</>;
  }
}

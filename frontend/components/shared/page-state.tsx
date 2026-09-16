"use client";

import type { ReactNode } from "react";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { isTransientNetworkError } from "@/lib/query-error-policy";
import { ErrorState } from "./error-state";
import { NoPermissionState } from "./no-permission-state";
import {
  FeatureLockedView,
  ModuleDeniedView,
  ModuleDisabledView,
  PlanRequiredView,
  QuotaExceededView,
} from "./page-state-views";

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
      return <>{loading}</>;
    case "denied":
      return (
        <NoPermissionState
          permission={resolution.permission ?? undefined}
          className={className}
          compact={compact}
        />
      );
    case "module-disabled":
      return (
        <ModuleDisabledView
          moduleKey={resolution.moduleKey}
          className={className}
          compact={compact}
        />
      );
    case "module-denied":
      return (
        <ModuleDeniedView
          moduleKey={resolution.moduleKey}
          className={className}
          compact={compact}
        />
      );
    case "plan-required":
      return (
        <PlanRequiredView
          moduleKey={resolution.moduleKey}
          upgradePath={resolution.upgradePath}
          className={className}
          compact={compact}
        />
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
          onRetry={onRetry}
        />
      );
    case "empty":
      return <>{empty ?? children}</>;
    case "ready":
      return <>{children}</>;
  }
}

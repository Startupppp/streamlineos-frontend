"use client";

import * as React from "react";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api-client";
import {
  FeatureLockedView,
  ModuleDisabledView,
  QuotaExceededView,
  type GateStateProps,
} from "@/components/shared/page-state-views";

interface AccessDeniedStateProps extends GateStateProps {
  message?: string;
  onRetry?: () => void;
}

function AccessDeniedState({ message, onRetry, compact, className }: AccessDeniedStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed",
        "border-destructive/30 bg-destructive/5",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="alert"
      aria-label="Access denied"
    >
      <div
        className={cn(
          "rounded-lg bg-destructive/10 flex items-center justify-center mb-4",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <ShieldOff
          className={cn("text-destructive", compact ? "h-4 w-4" : "h-6 w-6")}
        />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-sm",
        )}
      >
        Access denied
      </h3>

      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm mt-1.5",
        )}
      >
        {message ?? "You don't have permission to perform this action."}
      </p>

      {onRetry && (
        <div className={cn(compact ? "mt-4" : "mt-5")}>
          <Button variant="outline" size={compact ? "sm" : "default"} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export interface EntitlementGateProps {
  error?: unknown;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EntitlementGate({
  error,
  onRetry,
  children,
  className,
  compact = false,
}: EntitlementGateProps) {
  if (!isApiError(error)) return <>{children}</>;

  if (error.status === 403) {
    return (
      <AccessDeniedState
        message={error.message}
        onRetry={onRetry}
        compact={compact}
        className={className}
      />
    );
  }

  if (error.status !== 402) return <>{children}</>;

  const details = error.details as Record<string, unknown> | undefined;

  if (error.code === "QUOTA_EXCEEDED") {
    const limitKey = typeof details?.limitKey === "string" ? details.limitKey : "resource";
    const used = typeof details?.used === "number" ? details.used : 0;
    const limit = typeof details?.limit === "number" ? details.limit : 0;
    const upgradePath = typeof details?.upgradePath === "string" ? details.upgradePath : undefined;

    return (
      <QuotaExceededView
        limitKey={limitKey}
        used={used}
        limit={limit}
        upgradePath={upgradePath}
        onRetry={onRetry}
        compact={compact}
        className={className}
      />
    );
  }

  if (error.code === "FEATURE_NOT_AVAILABLE") {
    const feature = typeof details?.feature === "string" ? details.feature : "This feature";
    const requiredPlan = typeof details?.requiredPlan === "string" ? details.requiredPlan : "PAID";

    return (
      <FeatureLockedView
        feature={feature}
        requiredPlan={requiredPlan}
        onRetry={onRetry}
        compact={compact}
        className={className}
      />
    );
  }

  if (error.code === "MODULE_NOT_ENABLED") {
    const moduleKey = typeof details?.moduleKey === "string" ? details.moduleKey : "this module";

    return (
      <ModuleDisabledView
        moduleKey={moduleKey}
        compact={compact}
        className={className}
      />
    );
  }

  return <>{children}</>;
}

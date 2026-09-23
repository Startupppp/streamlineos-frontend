"use client";

import Link from "next/link";
import { Lock, Zap, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { humanizeLimitKey, humanizeModuleKey, type GateStateProps } from "./page-state-shared";
import { NoPermissionState } from "./no-permission-state";
import { ModuleDeniedView, PlanRequiredView } from "./page-state-plan-views";

export { ModuleDeniedView, PlanRequiredView };

interface QuotaExceededViewProps extends GateStateProps {
  limitKey: string;
  used: number;
  limit: number;
  upgradePath?: string;
  onRetry?: () => void;
}

export function QuotaExceededView({
  limitKey,
  used,
  limit,
  upgradePath,
  onRetry,
  compact,
  className,
}: QuotaExceededViewProps) {
  const label = humanizeLimitKey(limitKey);
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const path = upgradePath ?? "/settings/billing?tab=plan";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed",
        "border-status-warning-rule bg-status-warning-surface",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="status"
      aria-label={`${label} limit reached`}
    >
      <div
        className={cn(
          "rounded-lg bg-status-warning-surface flex items-center justify-center mb-4",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <Zap className={cn("text-status-warning-ink", compact ? "h-4 w-4" : "h-6 w-6")} />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-sm",
        )}
      >
        {label} limit reached
      </h3>

      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm mt-1.5",
        )}
      >
        You&apos;ve used {used} of {limit} {label.toLowerCase()}.
        Upgrade your plan to add more.
      </p>

      <div className={cn("w-full max-w-xs", compact ? "mt-3" : "mt-4")}>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Used</span>
          <span className="tabular-nums font-medium">
            {used} / {limit}
          </span>
        </div>
        <Progress
          value={pct}
          aria-label={`${label} usage`}
          className="h-1.5 [&>div]:bg-status-warning-fill"
        />
      </div>

      <div className={cn("flex items-center gap-2", compact ? "mt-4" : "mt-5")}>
        <Button asChild size={compact ? "sm" : "default"}>
          <Link href={path}>Upgrade plan</Link>
        </Button>
        {onRetry && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

interface FeatureLockedViewProps extends GateStateProps {
  feature: string;
  requiredPlan: string;
  onRetry?: () => void;
}

export function FeatureLockedView({
  feature,
  requiredPlan,
  onRetry,
  compact,
  className,
}: FeatureLockedViewProps) {
  const planLabel =
    requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1).toLowerCase();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed",
        "border-status-info-rule bg-status-info-surface",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="status"
      aria-label={`Feature not available: ${feature}`}
    >
      <div
        className={cn(
          "rounded-lg bg-status-info-surface flex items-center justify-center mb-4",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <Lock className={cn("text-status-info-ink", compact ? "h-4 w-4" : "h-6 w-6")} />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-sm",
        )}
      >
        Feature not available
      </h3>

      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm mt-1.5",
        )}
      >
        <span className="font-medium text-foreground">{feature}</span> requires the{" "}
        <span className="font-medium text-foreground">{planLabel}</span> plan or higher.
      </p>

      <div className={cn("flex items-center gap-2", compact ? "mt-4" : "mt-5")}>
        <Button asChild size={compact ? "sm" : "default"}>
          <Link href="/settings/billing?tab=plan">View plans</Link>
        </Button>
        {onRetry && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

interface ModuleDisabledViewProps extends GateStateProps {
  moduleKey: string;
}

export function ModuleDisabledView({ moduleKey, compact, className }: ModuleDisabledViewProps) {
  const moduleName = humanizeModuleKey(moduleKey);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed",
        "border-border bg-muted/30",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="status"
      aria-label={`Module not enabled: ${moduleName}`}
    >
      <div
        className={cn(
          "rounded-lg bg-muted flex items-center justify-center mb-4",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <ToggleLeft
          className={cn("text-muted-foreground", compact ? "h-4 w-4" : "h-6 w-6")}
        />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-sm",
        )}
      >
        Module not enabled
      </h3>

      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm mt-1.5",
        )}
      >
        <span className="font-medium text-foreground">{moduleName}</span> is not
        enabled for your organisation. An administrator can turn it on in settings.
      </p>

      <div className={cn(compact ? "mt-4" : "mt-5")}>
        <Button asChild variant="outline" size={compact ? "sm" : "default"}>
          <Link href="/settings/modules">Manage Modules</Link>
        </Button>
      </div>
    </div>
  );
}

export type DeniedResolution = Extract<
  PageStateResolution,
  { kind: "denied" | "module-disabled" | "module-denied" | "plan-required" }
>;

interface DeniedViewProps {
  resolution: DeniedResolution;
  compact?: boolean;
  className?: string;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled denial kind: ${JSON.stringify(value)}`);
}

export function DeniedView({ resolution, compact = false, className }: DeniedViewProps) {
  switch (resolution.kind) {
    case "denied":
      return (
        <NoPermissionState
          permission={resolution.permission ?? undefined}
          description={resolution.message}
          compact={compact}
          className={className}
        />
      );
    case "module-disabled":
      return (
        <ModuleDisabledView
          moduleKey={resolution.moduleKey}
          compact={compact}
          className={className}
        />
      );
    case "module-denied":
      return (
        <ModuleDeniedView
          moduleKey={resolution.moduleKey}
          compact={compact}
          className={className}
        />
      );
    case "plan-required":
      return (
        <PlanRequiredView
          moduleKey={resolution.moduleKey}
          upgradePath={resolution.upgradePath}
          compact={compact}
          className={className}
        />
      );
    default:
      return assertNever(resolution);
  }
}

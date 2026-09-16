"use client";

import Link from "next/link";
import { Lock, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { humanizeModuleKey, type GateStateProps } from "./page-state-shared";

interface ModuleDeniedViewProps extends GateStateProps {
  moduleKey: string;
}

export function ModuleDeniedView({ moduleKey, compact, className }: ModuleDeniedViewProps) {
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
      aria-label={`Access not granted: ${moduleName}`}
    >
      <div
        className={cn(
          "rounded-lg bg-muted flex items-center justify-center mb-4",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <ShieldOff className={cn("text-muted-foreground", compact ? "h-4 w-4" : "h-6 w-6")} />
      </div>
      <h3 className="font-semibold text-foreground text-sm">Access not granted</h3>
      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm mt-1.5",
        )}
      >
        Your access to <span className="font-medium text-foreground">{moduleName}</span> has been
        turned off. Ask an organization admin to restore it.
      </p>
    </div>
  );
}

interface PlanRequiredViewProps extends GateStateProps {
  moduleKey: string;
  upgradePath: string;
}

export function PlanRequiredView({
  moduleKey,
  upgradePath,
  compact,
  className,
}: PlanRequiredViewProps) {
  const moduleName = humanizeModuleKey(moduleKey);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed",
        "border-border bg-status-info-surface/40",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="status"
      aria-label={`Upgrade required: ${moduleName}`}
    >
      <div
        className={cn(
          "rounded-lg bg-status-info-surface flex items-center justify-center mb-4",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <Lock className={cn("text-status-info-ink", compact ? "h-4 w-4" : "h-6 w-6")} />
      </div>
      <h3 className="font-semibold text-foreground text-sm">Upgrade to unlock {moduleName}</h3>
      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm mt-1.5",
        )}
      >
        <span className="font-medium text-foreground">{moduleName}</span> is not included in your
        current plan.
      </p>
      <div className={cn(compact ? "mt-4" : "mt-5")}>
        <Button asChild size={compact ? "sm" : "default"}>
          <Link href={upgradePath}>View plans</Link>
        </Button>
      </div>
    </div>
  );
}

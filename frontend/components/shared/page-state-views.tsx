"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ToggleLeft } from "lucide-react";
import { StateIllustration } from "@/components/illustrations/state-illustration";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { humanizeModuleKey, type GateStateProps } from "./page-state-shared";
import { NoPermissionState } from "./no-permission-state";
import { EnableModuleButton } from "./enable-module-button";
import { ModuleDeniedView, PlanRequiredView } from "./page-state-plan-views";

export { ModuleDeniedView, PlanRequiredView };

interface NotFoundViewProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function NotFoundView({
  title = "Not found",
  description = "This doesn't exist, or you don't have access to it.",
  action,
  compact = false,
  className,
}: NotFoundViewProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-16 px-6",
        className,
      )}
      role="status"
      aria-label={title}
    >
      <StateIllustration
        preset="search"
        className={cn("opacity-80", compact ? "h-16 w-16 mb-3" : "h-28 w-28 mb-5")}
      />
      <h2 className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
        {title}
      </h2>
      <p
        className={cn(
          "text-muted-foreground mt-1.5 max-w-sm leading-relaxed",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {description}
      </p>
      {action ? <div className={compact ? "mt-4" : "mt-6"}>{action}</div> : null}
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

      <div className={cn("flex flex-col items-center gap-3", compact ? "mt-4" : "mt-5")}>
        <EnableModuleButton moduleKey={moduleKey} moduleName={moduleName} compact={compact} />
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

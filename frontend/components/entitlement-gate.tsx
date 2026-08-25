"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Zap, ToggleLeft, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api-client";

const LIMIT_LABELS: Record<string, string> = {
  members: "Members",
  projects: "Projects",
  kbPages: "KB Pages",
  chatChannels: "Chat Channels",
  crmLeads: "CRM Leads",
  crmContacts: "CRM Contacts",
  crmDeals: "CRM Deals",
  supportTickets: "Support Tickets",
  automations: "Automations",
  signEnvelopes: "Sign Envelopes",
  surveys: "Surveys",
  acctInvoices: "Accounting Invoices",
};

const MODULE_NAMES: Record<string, string> = {
  build: "Build (Project Management)",
  hr: "HR Management",
  crm: "CRM",
  inventory: "Inventory",
  payroll: "Payroll",
  accounting: "Accounting",
  kb: "Knowledge Base",
  support: "Helpdesk",
  ai: "AI Features",
  chat: "Chat",
  calendar: "Calendar",
  portal: "Client Portal",
  esign: "E-Sign",
};

function humanizeLimitKey(key: string): string {
  return (
    LIMIT_LABELS[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
  );
}

function humanizeModuleKey(key: string): string {
  return (
    MODULE_NAMES[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
  );
}

interface GateStateProps {
  compact: boolean;
  className?: string;
}

interface QuotaExceededStateProps extends GateStateProps {
  limitKey: string;
  used: number;
  limit: number;
  upgradePath?: string;
  onRetry?: () => void;
}

function QuotaExceededState({
  limitKey,
  used,
  limit,
  upgradePath,
  onRetry,
  compact,
  className,
}: QuotaExceededStateProps) {
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

interface FeatureUnavailableStateProps extends GateStateProps {
  feature: string;
  requiredPlan: string;
  onRetry?: () => void;
}

function FeatureUnavailableState({
  feature,
  requiredPlan,
  onRetry,
  compact,
  className,
}: FeatureUnavailableStateProps) {
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

interface ModuleNotEnabledStateProps extends GateStateProps {
  moduleKey: string;
}

function ModuleNotEnabledState({ moduleKey, compact, className }: ModuleNotEnabledStateProps) {
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
          <Link href="/settings/modules">Go to settings</Link>
        </Button>
      </div>
    </div>
  );
}

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
      <QuotaExceededState
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
      <FeatureUnavailableState
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
      <ModuleNotEnabledState
        moduleKey={moduleKey}
        compact={compact}
        className={className}
      />
    );
  }

  return <>{children}</>;
}

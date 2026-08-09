"use client";

import { useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useOrgModules, useToggleOrgModule } from "@/hooks/api/access/org-modules";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { getModuleCatalogEntry } from "@/lib/module-catalog";
import { cn } from "@/lib/utils";

export default function ModulesPage() {
  return (
    <DashboardGate permission="settings:manage">
      <ModulesContent />
    </DashboardGate>
  );
}

function ModuleCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <Skeleton className="h-5 w-9 rounded-full" />
    </div>
  );
}

interface ModuleCardProps {
  moduleKey: string;
  enabled: boolean;
  isPending: boolean;
  core?: boolean;
  onToggle: (moduleKey: string, enabled: boolean) => void;
}

function ModuleCard({
  moduleKey,
  enabled,
  isPending,
  core,
  onToggle,
}: ModuleCardProps) {
  const entry = getModuleCatalogEntry(moduleKey);
  const Icon = entry.icon;

  const handleToggle = useCallback(
    (checked: boolean) => {
      onToggle(moduleKey, checked);
    },
    [moduleKey, onToggle],
  );

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm",
        core && "opacity-75",
      )}
    >
      <span
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
          entry.iconBg,
          entry.iconText,
        )}
      >
        <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
          {entry.label}
        </p>
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          {entry.description
            ? entry.description
            : core
              ? "Always on"
              : enabled
                ? "Enabled"
                : "Disabled"}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isPending || !!core}
        aria-label={`Toggle ${entry.label}`}
        className="shrink-0"
      />
    </div>
  );
}

function ModulesContent() {
  const { data: modules, isLoading, isError, refetch } = useOrgModules();
  const toggleModule = useToggleOrgModule();
  const pendingModuleKey = toggleModule.variables?.moduleKey;

  const handleToggle = useCallback(
    (moduleKey: string, enabled: boolean) => {
      const entry = getModuleCatalogEntry(moduleKey);
      toggleModule.mutate(
        { moduleKey, enabled },
        {
          onSuccess: () =>
            toast.success(
              `${entry.label} ${enabled ? "enabled" : "disabled"}`,
            ),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [toggleModule],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Module Management"
      subtitle="Enable or disable feature modules for your organization"
    >
      <div className="flex flex-1 flex-col min-h-0">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <ModuleCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load modules"
            description="Unable to fetch module configuration. Please try again."
            onRetry={handleRetry}
          />
        ) : !modules || modules.length === 0 ? (
          <EmptyState
            illustration={null}
            title="No modules configured"
            description="Your organization has no feature modules available to manage."
            className="flex-1"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <ModuleCard
                key={mod.moduleKey}
                moduleKey={mod.moduleKey}
                enabled={mod.enabled}
                isPending={
                  toggleModule.isPending && pendingModuleKey === mod.moduleKey
                }
                core={mod.core}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

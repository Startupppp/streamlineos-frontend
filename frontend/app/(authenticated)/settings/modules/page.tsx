"use client";

import { useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useOrgModules, useToggleOrgModule } from "@/hooks/api/access/org-modules";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

const MODULE_LABELS: Record<string, string> = {
  hr: "HR & People",
  crm: "CRM & Sales",
  projects: "Projects",
  accounting: "Accounting",
  inventory: "Inventory",
  kb: "Knowledge Base",
  blog: "Blog",
  support: "Support",
  surveys: "Surveys",
  payroll: "Payroll",
  sign: "SignOS",
};

function getModuleLabel(moduleKey: string): string {
  return (
    MODULE_LABELS[moduleKey] ??
    moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)
  );
}

export default function ModulesPage() {
  return (
    <DashboardGate permission="settings:manage">
      <ModulesContent />
    </DashboardGate>
  );
}

function ModuleCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-5 w-9 rounded-full" />
      </CardContent>
    </Card>
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
  const handleToggle = useCallback(
    (checked: boolean) => {
      onToggle(moduleKey, checked);
    },
    [moduleKey, onToggle],
  );

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {getModuleLabel(moduleKey)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {core ? "Always on" : enabled ? "Enabled" : "Disabled"}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isPending || !!core}
          aria-label={`Toggle ${getModuleLabel(moduleKey)}`}
          className="flex-shrink-0 mt-0.5"
        />
      </CardContent>
    </Card>
  );
}

function ModulesContent() {
  const { data: modules, isLoading, isError, refetch } = useOrgModules();
  const toggleModule = useToggleOrgModule();

  const handleToggle = useCallback(
    (moduleKey: string, enabled: boolean) => {
      toggleModule.mutate(
        { moduleKey, enabled },
        {
          onSuccess: () =>
            toast.success(
              `${getModuleLabel(moduleKey)} ${enabled ? "enabled" : "disabled"}`,
            ),
          onError: (err) => toast.error(getApiError(err)),
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
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
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
              isPending={toggleModule.isPending}
              core={mod.core}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}

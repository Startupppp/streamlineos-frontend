"use client";

import { useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { useCan } from "@/hooks/api/access";
import {
  useUserModuleAccess,
  useSetUserModuleAccess,
  type UserModuleAccess,
} from "@/hooks/api/access/user-module-access";
import { getErrorMessage } from "@/lib/get-error-message";

const MODULE_LABELS: Record<string, string> = {
  hr: "HR",
  crm: "CRM",
  build: "Build",
  accounting: "Accounting & Finance",
  inventory: "Inventory",
  kb: "Knowledge",
  chat: "Chat",
  support: "Support",
  surveys: "Surveys",
  payroll: "Payroll",
  sign: "SignOS",
  timesheets: "Timesheets",
};

interface ModuleToggleRowProps {
  module: UserModuleAccess;
  disabled: boolean;
  core: boolean;
  onToggle: (moduleKey: string, enabled: boolean) => void;
}

function ModuleToggleRow({
  module,
  disabled,
  core,
  onToggle,
}: ModuleToggleRowProps) {
  const label = MODULE_LABELS[module.moduleKey] ?? module.moduleKey;
  const switchId = `user-module-${module.moduleKey}`;

  const handleChange = useCallback(
    (checked: boolean) => onToggle(module.moduleKey, checked),
    [module.moduleKey, onToggle],
  );

  function handleLabelClick(event: ReactMouseEvent<HTMLLabelElement>) {
    if (disabled) return;
    event.preventDefault();
    onToggle(module.moduleKey, !module.enabled);
  }

  return (
    <div className="flex h-9 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Label
          htmlFor={switchId}
          onClick={handleLabelClick}
          className={
            disabled
              ? "cursor-default text-label font-normal text-foreground"
              : "cursor-pointer text-label font-normal text-foreground"
          }
        >
          {label}
        </Label>
        {core ? (
          <Badge
            variant="outline"
            className="h-5 px-2 py-0.5 text-micro"
          >
            Included
          </Badge>
        ) : null}
      </div>
      <Switch
        id={switchId}
        checked={module.enabled}
        disabled={disabled}
        onCheckedChange={handleChange}
        aria-label={`${label} access`}
      />
    </div>
  );
}

interface UserModuleAccessSectionProps {
  userId: string;
  isMemberActive: boolean;
}

export function UserModuleAccessSection({
  userId,
  isMemberActive,
}: UserModuleAccessSectionProps) {
  const canManage = useCan("settings:organization:manage");
  const {
    data: modules,
    error: modulesError,
    isError: isModulesError,
    isPending: isModulesPending,
    refetch: refetchModules,
  } = useUserModuleAccess(userId);
  const setAccess = useSetUserModuleAccess(userId);
  const togglesDisabled = !canManage || !isMemberActive || setAccess.isPending;

  const handleToggle = useCallback(
    (moduleKey: string, enabled: boolean) => {
      if (!isMemberActive) return;
      setAccess.mutate(
        { moduleKey, enabled },
        { onError: (error) => toast.error(getErrorMessage(error)) },
      );
    },
    [isMemberActive, setAccess],
  );

  const handleRetry = useCallback(() => {
    void refetchModules();
  }, [refetchModules]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Module access
      </p>
      <p className="text-dense text-muted-foreground">
        {isMemberActive
          ? "Optional modules can be turned off per person. Included modules are available to every active member."
          : "Module access can only be changed for active members."}
      </p>
      {isModulesPending && !modules ? (
        <div className="space-y-1 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : isModulesError ? (
        <ErrorState
          compact
          title="Couldn’t load module access"
          description={getErrorMessage(modulesError)}
          onRetry={handleRetry}
        />
      ) : (
        <div className="pt-1">
          {(modules ?? []).map((module) => (
            <ModuleToggleRow
              key={module.moduleKey}
              module={module}
              core={module.core}
              disabled={togglesDisabled || module.core}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  onToggle: (moduleKey: string, enabled: boolean) => void;
}

function ModuleToggleRow({ module, disabled, onToggle }: ModuleToggleRowProps) {
  const handleChange = useCallback(
    (checked: boolean) => onToggle(module.moduleKey, checked),
    [module.moduleKey, onToggle],
  );

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-foreground">
        {MODULE_LABELS[module.moduleKey] ?? module.moduleKey}
      </span>
      <Switch
        checked={module.enabled}
        disabled={disabled}
        onCheckedChange={handleChange}
        className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
        aria-label={`${MODULE_LABELS[module.moduleKey] ?? module.moduleKey} access`}
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
  const { data: modules, isLoading } = useUserModuleAccess(userId);
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

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Module access
      </p>
      <p className="text-[11px] text-muted-foreground">
        {isMemberActive
          ? "Turn a module off to hide it from this person and block its access."
          : "Module access can only be changed for active members."}
      </p>
      {isLoading ? (
        <div className="space-y-2 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5 pt-1">
          {(modules ?? []).map((module) => (
            <ModuleToggleRow
              key={module.moduleKey}
              module={module}
              disabled={togglesDisabled}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

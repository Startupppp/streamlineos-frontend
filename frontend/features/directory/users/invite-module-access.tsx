"use client";

import { useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MANIFEST } from "@/lib/module-manifest";
import type { ModuleEntry } from "@/lib/module-manifest-schema";
import { cn } from "@/lib/utils";
import type { InviteUserFormValues } from "./user-invite-schema";

const ADMINISTRABLE_MODULES: readonly ModuleEntry[] = MANIFEST.modules.filter(
  (m) => m.administrable,
);

type ModuleAccess = NonNullable<InviteUserFormValues["moduleAccess"]>;

export const INVITE_ACCESS_PRESETS: readonly {
  id: string;
  label: string;
  access: ModuleAccess;
}[] = [
  {
    id: "build-member",
    label: "Build Member",
    access: [{ moduleKey: "build", standing: "MEMBER" }],
  },
  {
    id: "build-admin",
    label: "Build Admin",
    access: [{ moduleKey: "build", standing: "ADMIN" }],
  },
  {
    id: "hr-admin",
    label: "HR Admin",
    access: [{ moduleKey: "hr", standing: "ADMIN" }],
  },
  {
    id: "manager",
    label: "Manager",
    access: [{ moduleKey: "hr", standing: "MEMBER" }],
  },
  {
    id: "finance",
    label: "Finance",
    access: [
      { moduleKey: "payroll", standing: "ADMIN" },
      { moduleKey: "accounting", standing: "ADMIN" },
    ],
  },
  { id: "viewer", label: "No module access", access: [] },
];

function accessKey(
  access: readonly { moduleKey: string; standing: string }[],
): string {
  return access
    .map((item) => `${item.moduleKey}:${item.standing}`)
    .sort()
    .join("|");
}

export function describeModuleAccess(
  access: readonly { moduleKey: string; standing: string }[],
): string | null {
  if (access.length === 0) return null;
  const preset = INVITE_ACCESS_PRESETS.find(
    (candidate) => accessKey(candidate.access) === accessKey(access),
  );
  if (preset) return preset.label;
  return access
    .map((item) => {
      const name =
        MANIFEST.modules.find((mod) => mod.id === item.moduleKey)
          ?.displayName ?? item.moduleKey;
      return `${name} ${item.standing === "ADMIN" ? "Admin" : "Member"}`;
    })
    .join(", ");
}

function isModuleStanding(value: string): value is "MEMBER" | "ADMIN" {
  return value === "MEMBER" || value === "ADMIN";
}

interface ModuleAccessRowProps {
  moduleKey: string;
  displayName: string;
  currentStanding: string;
  onStandingChange: (moduleKey: string, standing: string) => void;
}

function ModuleAccessRow({
  moduleKey,
  displayName,
  currentStanding,
  onStandingChange,
}: ModuleAccessRowProps) {
  const handleChange = useCallback(
    (value: string) => onStandingChange(moduleKey, value),
    [moduleKey, onStandingChange],
  );
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="min-w-0 truncate text-sm">{displayName}</span>
      <Select value={currentStanding} onValueChange={handleChange}>
        <SelectTrigger
          className="h-8 w-[7.25rem] shrink-0 text-xs"
          aria-label={`Module access for ${displayName}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">No access</SelectItem>
          <SelectItem value="MEMBER">Member</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface ModuleAccessSectionProps {
  field: {
    value: InviteUserFormValues["moduleAccess"];
    onChange: (value: InviteUserFormValues["moduleAccess"]) => void;
  };
}

export function ModuleAccessSection({ field }: ModuleAccessSectionProps) {
  const includedModules = useMemo(
    () => ADMINISTRABLE_MODULES.filter((mod) => !mod.planGated),
    [],
  );
  const gatedModules = useMemo(
    () => ADMINISTRABLE_MODULES.filter((mod) => mod.planGated),
    [],
  );
  const activePresetId = useMemo(() => {
    const current = accessKey(field.value ?? []);
    return (
      INVITE_ACCESS_PRESETS.find(
        (preset) => accessKey(preset.access) === current,
      )?.id ?? null
    );
  }, [field.value]);

  function handleStandingChange(moduleKey: string, standing: string) {
    const current = (field.value ?? []).filter(
      (item) => item.moduleKey !== moduleKey,
    );
    if (isModuleStanding(standing)) {
      field.onChange([...current, { moduleKey, standing }]);
    } else {
      field.onChange(current);
    }
  }

  function handlePreset(access: ModuleAccess) {
    return function applyPreset(): void {
      field.onChange([...access]);
    };
  }

  return (
    <div className="min-w-0 space-y-2.5">
      <ScrollArea orientation="horizontal" className="w-full min-w-0 pb-1">
        <div
          className="flex w-max min-w-full flex-nowrap items-center gap-1"
          role="group"
          aria-label="Access presets"
        >
          {INVITE_ACCESS_PRESETS.map((preset) => {
            const selected = preset.id === activePresetId;
            return (
              <Button
                key={preset.id}
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-7 w-auto shrink-0 whitespace-nowrap px-2 text-xs font-normal",
                  selected && "pointer-events-none",
                )}
                aria-pressed={selected}
                onClick={handlePreset(preset.access)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {includedModules.length > 0 ? (
        <ScrollArea orientation="horizontal" className="w-full min-w-0 pb-1">
          <div className="flex w-max min-w-full flex-nowrap items-center gap-1">
            <span className="shrink-0 text-micro text-muted-foreground">
              Included
            </span>
            {includedModules.map((mod) => (
              <Badge
                key={mod.id}
                variant="outline"
                className="h-5 shrink-0 whitespace-nowrap px-1.5 py-0 text-micro font-normal"
                aria-label={`Module access for ${mod.displayName}: included for every member`}
              >
                {mod.displayName}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      ) : null}

      <ScrollArea className="h-36 w-full min-w-0 pr-1">
        <div className="space-y-0.5">
          {gatedModules.map((mod) => {
            const entry = (field.value ?? []).find(
              (item) => item.moduleKey === mod.id,
            );
            return (
              <ModuleAccessRow
                key={mod.id}
                moduleKey={mod.id}
                displayName={mod.displayName}
                currentStanding={entry?.standing ?? "NONE"}
                onStandingChange={handleStandingChange}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

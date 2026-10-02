"use client";

import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MANIFEST } from "@/lib/module-manifest";
import type { ModuleEntry } from "@/lib/module-manifest-schema";
import type { InviteUserFormValues } from "./user-invite-schema";

const ADMINISTRABLE_MODULES: readonly ModuleEntry[] = MANIFEST.modules.filter(
  (m) => m.administrable,
);

type ModuleAccess = NonNullable<InviteUserFormValues["moduleAccess"]>;

/**
 * BUG-HRMS-003. The job roles QA asked for, as quick fills of the Module access
 * matrix rather than a fourth org role (there are three org standings, BE-102).
 * The invite still sends `role` + `moduleAccess`, which the backend already
 * accepts and applies on acceptance, so a preset is never more than the grants
 * it shows — and every row stays editable after it is applied.
 */
export const INVITE_ACCESS_PRESETS: readonly { id: string; label: string; access: ModuleAccess }[] = [
  { id: "hr-admin", label: "HR Admin", access: [{ moduleKey: "hr", standing: "ADMIN" }] },
  { id: "manager", label: "Manager", access: [{ moduleKey: "hr", standing: "MEMBER" }] },
  {
    id: "finance",
    label: "Finance",
    access: [
      { moduleKey: "payroll", standing: "ADMIN" },
      { moduleKey: "accounting", standing: "ADMIN" },
    ],
  },
  { id: "viewer", label: "Viewer", access: [] },
];

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
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{displayName}</span>
      <Select value={currentStanding} onValueChange={handleChange}>
        <SelectTrigger
          className="w-32 h-9 text-sm"
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Access presets">
        {INVITE_ACCESS_PRESETS.map((preset) => (
          <Button key={preset.id} type="button" variant="outline" size="sm" onClick={handlePreset(preset.access)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        A preset fills the grants below; Viewer clears them, leaving self-service only.
      </p>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {ADMINISTRABLE_MODULES.map((mod) => {
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
    </div>
  );
}

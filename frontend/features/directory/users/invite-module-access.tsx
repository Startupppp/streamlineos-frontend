"use client";

import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MANIFEST } from "@/lib/module-manifest";
import type { ModuleEntry } from "@/lib/module-manifest-schema";
import type { InviteUserFormValues } from "./user-invite-schema";

const ADMINISTRABLE_MODULES: readonly ModuleEntry[] = MANIFEST.modules.filter(
  (m) => m.administrable,
);

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

  return (
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
  );
}

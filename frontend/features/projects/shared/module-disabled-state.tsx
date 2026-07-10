"use client";

import { EmptyState } from "@/components/ui/empty-state";

interface ModuleDisabledStateProps {
  moduleName: string;
  projectId: number;
}

export function ModuleDisabledState({ moduleName, projectId }: ModuleDisabledStateProps) {
  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <EmptyState
        illustrationPreset="settings"
        title={`${moduleName} is disabled`}
        description={`This module has been turned off for this project. Go to project settings to enable it.`}
        action={{
          label: "Open Settings",
          href: `/projects/${projectId}/settings`,
        }}
      />
    </div>
  );
}

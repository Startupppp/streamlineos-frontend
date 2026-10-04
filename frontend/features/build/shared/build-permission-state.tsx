"use client";

import { cn } from "@/lib/utils";
import { ModuleDisabledState } from "./module-disabled-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";

type BuildPermissionStateProps =
  | {
      variant: "module-disabled";
      moduleName: string;
      projectId: number;
      className?: string;
    }
  | {
      variant: "access-denied";
      className?: string;
    };

export function BuildPermissionState(props: BuildPermissionStateProps) {
  const { variant, className } = props;

  if (variant === "module-disabled") {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        <ModuleDisabledState
          moduleName={props.moduleName}
          projectId={props.projectId}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <NoPermissionState />
    </div>
  );
}

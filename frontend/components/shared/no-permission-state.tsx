"use client";

import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoPermissionStateProps {
  permission: string;
  title?: string;
  description?: string;
  className?: string;
}

export function NoPermissionState({
  permission,
  title = "Access Restricted",
  description,
  className,
}: NoPermissionStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center flex-1 py-24 text-center px-6",
        className,
      )}
    >
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 text-destructive" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-2">
        {description ?? "You don’t have the required permission for this section."}
      </p>
      <p className="text-xs text-muted-foreground/60 font-mono bg-muted px-2 py-1 rounded">
        {permission}
      </p>
      <p className="text-xs text-muted-foreground mt-3">
        Contact your administrator to request access.
      </p>
    </div>
  );
}

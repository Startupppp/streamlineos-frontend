"use client";

import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoPermissionStateProps {
  permission?: string;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function NoPermissionState({
  permission,
  title = "Access Restricted",
  description,
  className,
  compact = false,
}: NoPermissionStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "flex-1 py-24 px-6",
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          "rounded-2xl bg-destructive/10 flex items-center justify-center mb-4",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
      >
        <ShieldAlert className={cn("text-destructive", compact ? "w-5" : "w-7")} />
      </div>
      <h2 className={cn("font-semibold mb-1", compact ? "text-sm" : "text-base")}>{title}</h2>
      <p
        className={cn(
          "text-muted-foreground max-w-sm mb-2",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {description ?? "You don’t have the required permission for this section."}
      </p>
      {permission ? (
        <p className="text-xs text-foreground/80 font-mono bg-muted px-2 py-1 rounded">
          {permission}
        </p>
      ) : null}
      {compact ? null : (
        <p className="text-xs text-muted-foreground mt-3">
          Contact your administrator to request access.
        </p>
      )}
    </div>
  );
}

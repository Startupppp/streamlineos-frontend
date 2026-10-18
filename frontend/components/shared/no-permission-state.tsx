"use client";

import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { permissionKeyLabel } from "@/lib/rbac/administering-module";

interface NoPermissionStateProps {
  permission?: PermissionKey | readonly PermissionKey[];
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
  const permissions = permission === undefined ? [] : typeof permission === "string" ? [permission] : permission;
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
        {description ?? (permissions.length === 1 && permissions[0] ? `You need the ${permissionKeyLabel(permissions[0])} permission.` : "You don’t have the required permission for this section.")}
      </p>
      {permissions.length > 0 ? (
        <details className="mt-1">
          <summary className="text-xs text-muted-foreground cursor-pointer select-none">
            Permission details
          </summary>
          {permissions.length > 1 ? (
            <p className="text-xs text-muted-foreground mt-1">Any one of these permissions grants access:</p>
          ) : null}
          <div className="mt-1 flex max-w-md flex-wrap justify-center gap-1.5">
            {permissions.map((key) => (
              <p key={key} className="text-xs text-foreground/80 font-mono bg-muted px-2 py-1 rounded">
                {key}
              </p>
            ))}
          </div>
        </details>
      ) : null}
      {compact ? null : (
        <p className="text-xs text-muted-foreground mt-3">
          Contact your administrator to request access, or{" "}
          <a
            href="mailto:?"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            send them a request
          </a>
          .
        </p>
      )}
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { formatRelative } from "date-fns";
import { Loader2 } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import type { Delegation } from "@/hooks/api/delegations";

export function DelegationSkeletons({ count }: { count: number }) {
  return (
    <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

export interface DelegationRowProps {
  delegation: Delegation;
  memberMap: Map<string, string>;
  nameField: "delegator" | "delegatee";
  canRevoke?: boolean;
  onRevoke?: (delegation: Delegation) => void;
  isRevoking?: boolean;
}

export function DelegationRow({
  delegation,
  memberMap,
  nameField,
  canRevoke,
  onRevoke,
  isRevoking,
}: DelegationRowProps) {
  const handleRevoke = useCallback(
    () => onRevoke?.(delegation),
    [delegation, onRevoke],
  );

  const displayName =
    (nameField === "delegator"
      ? delegation.delegatorName
      : delegation.delegateeName) ??
    "Team member";
  const isRevoked = delegation.lifecycle === "REVOKED";
  const isExpired = delegation.lifecycle === "EXPIRED";
  const isInactive = isRevoked || isExpired;
  const isScheduled = delegation.lifecycle === "SCHEDULED";
  const lifecycleLabel = isRevoked
    ? "Revoked"
    : isExpired
      ? "Expired"
      : isScheduled
        ? "Starts"
        : "Ends";
  const lifecycleDate = isRevoked
    ? (delegation.revokedAt ?? delegation.endsAt)
    : isScheduled
      ? delegation.startsAt
      : delegation.endsAt;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <span className="text-sm font-medium leading-none">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {delegation.permissions.length} permission
            {delegation.permissions.length !== 1 ? "s" : ""}
          </span>
          {isInactive && (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground shrink-0"
            >
              {isRevoked ? "Revoked" : "Expired"}
            </Badge>
          )}
          {isScheduled ? (
            <Badge variant="outline" className="shrink-0 text-xs text-status-info-ink">
              Scheduled
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {lifecycleLabel} {lifecycleDate ? formatRelative(new Date(lifecycleDate), new Date()) : ""}
          {delegation.reason && (
            <span className="text-muted-foreground/60">
              {" "}
              · {delegation.reason}
            </span>
          )}
        </p>
      </div>
      {canRevoke &&
        !isInactive &&
        onRevoke &&
        (isRevoking ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-7 shrink-0 text-muted-foreground"
            disabled
            aria-label="Revoking"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </Button>
        ) : (
          <AnimatedIconButton
            icon={XIcon}
            iconSize={14}
            variant="ghost"
            size="icon"
            className="w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleRevoke}
            aria-label="Revoke delegation"
          />
        ))}
    </div>
  );
}

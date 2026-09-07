"use client";

import { useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { AgentToken } from "@/hooks/api/build/agent-tokens";
import { PM_ROW } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

export function tokenStatus(token: AgentToken): "active" | "revoked" | "expired" {
  if (token.revokedAt) return "revoked";
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return "expired";
  return "active";
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "Never";
  const d = new Date(expiresAt);
  if (d < new Date()) return `Expired ${format(d, "MMM d, yyyy")}`;
  return format(d, "MMM d, yyyy");
}

function StatusBadge({ status }: { status: "active" | "revoked" | "expired" }) {
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="border-status-success-rule bg-status-success-surface text-status-success-ink"
      >
        Active
      </Badge>
    );
  }
  if (status === "revoked") {
    return (
      <Badge
        variant="outline"
        className="border-destructive/40 bg-status-danger-surface text-status-danger-ink"
      >
        Revoked
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-status-warning-rule bg-status-warning-surface text-status-warning-ink"
    >
      Expired
    </Badge>
  );
}

interface TokenRowProps {
  token: AgentToken;
  onRevoke: (id: number) => void;
}

export function TokenRow({ token, onRevoke }: TokenRowProps) {
  const status = tokenStatus(token);
  const handleRevoke = useCallback(() => onRevoke(token.id), [onRevoke, token.id]);

  return (
    <div className={cn(PM_ROW, "gap-3 py-3")}>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TruncatedText text={token.name} className="text-sm font-medium" />
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {token.tokenPrefix}…
          </code>
          <StatusBadge status={status} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Created {relativeDate(token.createdAt)}</span>
          {token.lastUsedAt ? <span>Last used {relativeDate(token.lastUsedAt)}</span> : null}
          <span>Expires {expiryLabel(token.expiresAt)}</span>
        </div>
      </div>
      {status === "active" ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleRevoke}
        >
          Revoke
        </Button>
      ) : null}
    </div>
  );
}

export function TokenListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-0"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
          <Skeleton className="h-7 w-14 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TokensEmptyHint() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/70 bg-muted/40 px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Bot className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium text-foreground">No tokens yet</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Use New token above to connect an AI agent to your projects.
        </p>
      </div>
    </div>
  );
}

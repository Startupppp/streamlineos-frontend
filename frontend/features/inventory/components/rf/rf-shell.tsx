"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, CloudOff, Loader2, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useInventoryOutbox } from "@/hooks/api/inventory/offline-outbox";

export function RfShell({
  title,
  subtitle,
  backHref,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: ReactNode;
}) {
  const outbox = useInventoryOutbox();
  const pending = outbox.counts.queued + outbox.counts.inFlight;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back to tasks"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <Badge
          variant="outline"
          className={cn(
            "text-dense gap-1",
            outbox.isOnline
              ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
              : "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
          )}
        >
          {outbox.isOnline ? <Wifi className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
          {outbox.isOnline ? "Online" : "Offline"}
        </Badge>

        {pending > 0 && (
          <Badge
            variant="outline"
            className="text-dense gap-1 bg-status-info-surface text-status-info-ink border-status-info-rule"
          >
            <Loader2 className="h-3 w-3" />
            {pending} queued
          </Badge>
        )}

        {outbox.counts.conflict > 0 && (
          <Badge
            variant="outline"
            className="text-dense bg-status-danger-surface text-status-danger-ink border-status-danger-rule"
          >
            {outbox.counts.conflict} need attention
          </Badge>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">{children}</div>
    </div>
  );
}

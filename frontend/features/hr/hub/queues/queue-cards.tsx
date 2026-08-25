"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { HrIconWell } from "@/features/hr/shared/hr-ui";
import {
  hubSectionData,
  type HrHubAccess,
  type HrHubSections,
} from "@/hooks/api/hr/hub";

export type QueueTone = "red" | "amber" | "neutral";

export function resolveQueueTone(count: number, critical = false): QueueTone {
  if (count === 0) return "neutral";
  return critical ? "red" : "amber";
}

export const TONE_BADGE: Record<QueueTone, string> = {
  red: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  neutral: "bg-muted text-muted-foreground",
};

export interface HrQueueCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  count: number;
  context: string;
  href: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  tone: QueueTone;
}

export function HrQueueCard({
  icon: Icon,
  label,
  count,
  context,
  href,
  isLoading,
  isError,
  onRetry,
  tone,
}: HrQueueCardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
        <Skeleton className="h-6 w-8 rounded-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
        <HrIconWell tone="slate" size="sm">
          <AlertCircle className="h-3.5 w-3.5" />
        </HrIconWell>
        <p className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
          {label} — {getErrorMessage(new Error("unavailable"))}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-micro text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-0.5"
        >
          <RefreshCcw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <HrIconWell
        tone={tone === "red" ? "rose" : tone === "amber" ? "amber" : "slate"}
        size="sm"
      >
        <Icon className="h-3.5 w-3.5" />
      </HrIconWell>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <p className="text-micro text-muted-foreground truncate">{context}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold",
            TONE_BADGE[tone],
          )}
        >
          {count}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

export function OpsInboxCard({
  access,
  section,
  isLoading,
  onRetry,
}: {
  access: HrHubAccess;
  section: HrHubSections["opsInbox"] | undefined;
  isLoading: boolean;
  onRetry: () => void;
}) {
  const data = hubSectionData(section);
  const isError = section?.status === "error";

  if (!access.canCases) return null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4">
        <p className="text-xs text-muted-foreground flex-1">
          {getErrorMessage(new Error("Ops inbox unavailable"))}
        </p>
        <Button size="sm" variant="ghost" onClick={onRetry} className="h-7 text-xs">
          Retry
        </Button>
      </div>
    );
  }

  const totals = data?.totals;
  if (!totals) return null;

  const total = (totals.cases ?? 0) + (totals.safety ?? 0) + (totals.helpdesk ?? 0);
  const isCritical = (totals.criticalAging ?? 0) > 0 || (totals.slaBreached ?? 0) > 0;
  const tone = resolveQueueTone(total, isCritical);

  return (
    <Link
      href="/hr/service-delivery"
      className="group block rounded-xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-sm font-semibold text-foreground">Service delivery inbox</p>
        <span
          className={cn(
            "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold",
            TONE_BADGE[tone],
          )}
        >
          {total}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(totals.cases ?? 0) > 0 && (
          <span className="text-micro font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {totals.cases} cases
          </span>
        )}
        {(totals.safety ?? 0) > 0 && (
          <span className="text-micro font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
            {totals.safety} safety
          </span>
        )}
        {(totals.helpdesk ?? 0) > 0 && (
          <span className="text-micro font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {totals.helpdesk} helpdesk
          </span>
        )}
        {(totals.criticalAging ?? 0) > 0 && (
          <span className="text-micro font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
            {totals.criticalAging} critical
          </span>
        )}
        {(totals.slaBreached ?? 0) > 0 && (
          <span className="text-micro font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            {totals.slaBreached} SLA breached
          </span>
        )}
        {total === 0 && (
          <span className="text-micro text-muted-foreground">Nothing needs attention</span>
        )}
      </div>
    </Link>
  );
}

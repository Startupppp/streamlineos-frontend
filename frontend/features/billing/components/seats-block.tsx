"use client";

import Link from "next/link";
import { BRAND_SUPPORT_EMAIL } from "@/lib/branding";
import { Users, UserCheck, UserMinus, TrendingUp, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSeatInfo, useSubscription } from "@/hooks/api/subscription";
import type { StatTone } from "@/components/ui/stat-card";

function utilizationColor(percent: number): string {
  if (percent >= 90) return "text-red-600 dark:text-red-400";
  if (percent >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function progressBarColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function utilizationStatTone(percent: number): StatTone {
  if (percent >= 90) return "red";
  if (percent >= 70) return "amber";
  return "emerald";
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function SeatsBlockSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
      <Skeleton className="h-4 w-32" />
      <StatCardGrid cols={4}>
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} label="" value={0} icon={Users} isLoading />
        ))}
      </StatCardGrid>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
    </div>
  );
}

export function SeatsBlock() {
  const {
    data: seatInfo,
    isLoading: seatsLoading,
    isError: seatsIsError,
    error: seatsErrorObj,
    refetch: refetchSeats,
  } = useSeatInfo();
  const { data: subscriptionData, isLoading: subLoading } = useSubscription();

  const isLoading = seatsLoading || subLoading;

  if (isLoading) {
    return <SeatsBlockSkeleton />;
  }

  if (seatsIsError) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-5">
        <ErrorState
          compact
          title="Failed to load seat information"
          description={getErrorMessage(seatsErrorObj)}
          onRetry={refetchSeats}
        />
      </div>
    );
  }

  const total = seatInfo?.total ?? 0;
  const used = seatInfo?.used ?? 0;
  const available = seatInfo?.available ?? 0;
  const utilizationPercent = total > 0 ? Math.round((used / total) * 100) : 0;
  const planName = subscriptionData?.subscription?.plan ?? "STARTER";
  const isEnterprise = planName === "ENTERPRISE";
  const isAtCapacity = available === 0 && total > 0;
  const isNearCapacity = utilizationPercent >= 80 && !isAtCapacity;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Seats & Licenses</h3>

      <StatCardGrid cols={4}>
        <StatCard label="Total Seats" value={total} icon={Users} tone="blue" />
        <StatCard label="Used Seats" value={used} icon={UserCheck} tone="emerald" />
        <StatCard label="Available" value={available} icon={UserMinus} tone="blue" />
        <StatCard
          label="Utilization"
          value={`${utilizationPercent}%`}
          icon={TrendingUp}
          tone={utilizationStatTone(utilizationPercent)}
        />
      </StatCardGrid>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {used} of {total} seats in use · {available} seat{available !== 1 ? "s" : ""} available
          </span>
          <span className={cn("text-xs font-semibold", utilizationColor(utilizationPercent))}>
            {utilizationPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressBarColor(utilizationPercent))}
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <dl className="space-y-1 text-xs">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium text-foreground">{capitalize(planName)}</dd>
          </div>
        </dl>
        {isEnterprise && (
          <Button variant="outline" size="sm" className="text-xs h-7" asChild>
            <Link href={`mailto:${BRAND_SUPPORT_EMAIL}`}>Contact Sales</Link>
          </Button>
        )}
      </div>

      {isAtCapacity && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive leading-snug">
            <span className="font-semibold">All seats are in use.</span> New invitations will be
            rejected until you add more seats or remove inactive members.
          </p>
        </div>
      )}

      {isNearCapacity && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
            <span className="font-semibold">Running low on seats</span> — only {available} seat{available !== 1 ? "s" : ""}{" "}
            remaining. Consider adding seats before you reach the limit.
          </p>
        </div>
      )}

      {!isAtCapacity && !isNearCapacity && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Seats are reserved when you send invitations. Active members consume one seat each.
          </p>
        </div>
      )}
    </div>
  );
}

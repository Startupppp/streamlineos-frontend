"use client";

import Link from "next/link";
import { Info, Users, UserCheck, UserMinus, TrendingUp } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
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

function utilizationLabel(percent: number): string {
  if (percent >= 90) return "Near limit";
  if (percent >= 70) return "Moderate usage";
  return "Healthy";
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function SeatsPageSkeleton() {
  return (
    <div className="space-y-8">
      <StatCardGrid cols={4}>
        {[
          { label: "Total Seats", icon: Users, tone: "blue" as const },
          { label: "Used Seats", icon: UserCheck, tone: "emerald" as const },
          { label: "Available Seats", icon: UserMinus, tone: "blue" as const },
          { label: "Utilization", icon: TrendingUp, tone: "emerald" as const },
        ].map(({ label, icon, tone }) => (
          <StatCard key={label} label={label} value={0} icon={icon} tone={tone} isLoading />
        ))}
      </StatCardGrid>

      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3.5 w-40" />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeatsPage() {
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
    return (
      <PageWrapper
        title="Seats & Licenses"
        subtitle="Manage seat allocation and team capacity"
      >
        <SeatsPageSkeleton />
      </PageWrapper>
    );
  }

  if (seatsIsError) {
    return (
      <PageWrapper
        title="Seats & Licenses"
        subtitle="Manage seat allocation and team capacity"
      >
        <ErrorState
          title="Failed to load seat information"
          description={getErrorMessage(seatsErrorObj)}
          onRetry={refetchSeats}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const total = seatInfo?.total ?? 0;
  const used = seatInfo?.used ?? 0;
  const available = seatInfo?.available ?? 0;
  const utilizationPercent = total > 0 ? Math.round((used / total) * 100) : 0;
  const planName = subscriptionData?.subscription?.plan ?? "STARTER";
  const isEnterprise = planName === "ENTERPRISE";

  return (
    <PageWrapper
      title="Seats & Licenses"
      subtitle="Manage seat allocation and team capacity"
    >
      <div className="space-y-8">
        <StatCardGrid cols={4}>
          <StatCard
            label="Total Seats"
            value={total}
            icon={Users}
            tone="blue"
          />
          <StatCard
            label="Used Seats"
            value={used}
            icon={UserCheck}
            tone="emerald"
          />
          <StatCard
            label="Available Seats"
            value={available}
            icon={UserMinus}
            tone="blue"
          />
          <StatCard
            label="Utilization"
            value={`${utilizationPercent}%`}
            icon={TrendingUp}
            tone={utilizationStatTone(utilizationPercent)}
          />
        </StatCardGrid>

        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Seat Utilization
            </h3>
            <span
              className={cn(
                "text-sm font-semibold",
                utilizationColor(utilizationPercent),
              )}
            >
              {utilizationPercent}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressBarColor(utilizationPercent),
              )}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {used} of {total} seats in use · {available} seat
            {available !== 1 ? "s" : ""} available
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Plan Details
          </h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Current plan</dt>
              <dd className="font-medium text-foreground">
                {capitalize(planName)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Seat limit</dt>
              <dd className="font-medium text-foreground">{total} seats</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Usage status</dt>
              <dd
                className={cn(
                  "font-medium",
                  utilizationColor(utilizationPercent),
                )}
              >
                {utilizationLabel(utilizationPercent)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Need more seats?
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Add more seats to your plan. Billed monthly, prorated for the
              current period.
            </p>
          </div>
          <div className="shrink-0">
            {isEnterprise ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="mailto:sales@streamlineos.com">Contact Sales</Link>
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/billing/checkout">Upgrade Plan</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              How seats work
            </h3>
          </div>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
            <li>Seats are reserved when you send invitations</li>
            <li>Active members consume one seat each</li>
            <li>Reduce seats at next billing cycle renewal</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
}

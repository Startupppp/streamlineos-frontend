"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PM_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

const PRODUCT_CARD_SLOTS = [0, 1, 2] as const;
const GOAL_CARD_SLOTS = [0, 1, 2, 3, 4, 5] as const;
const ROADMAP_COLUMN_SLOTS = [0, 1, 2, 3] as const;
const ROADMAP_CARD_SLOTS = [0, 1] as const;

function SummaryPanelSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <StatCardGridSkeleton
        cols={cardCount === 4 ? 4 : cardCount === 3 ? 3 : 2}
        count={cardCount}
        className="mt-4"
        stackOnMobile={cardCount === 3}
      />
    </div>
  );
}

export function ManagedProductOverviewSkeleton() {
  return (
    <div
      data-testid="managed-product-overview-skeleton"
      className="flex w-full min-w-0 flex-col gap-4 pb-8"
    >
      <StatCardGridSkeleton cols={3} count={3} />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {PRODUCT_CARD_SLOTS.map((slot) => (
            <div key={slot} className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {PRODUCT_CARD_SLOTS.map((slot) => (
            <div key={slot} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1].map((slot) => (
            <div key={slot} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProductInsightsSkeleton() {
  return (
    <div data-testid="product-insights-skeleton" className="space-y-6">
      <SummaryPanelSkeleton cardCount={3} />

      <div>
        <Skeleton className="mb-3 h-4 w-32" />
        <StatCardGridSkeleton cols={3} count={3} />
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-36" />
        <StatCardGridSkeleton cols={4} count={4} />
      </div>

      <div>
        <Skeleton className="mb-2 h-4 w-52" />
        <Skeleton className="mb-3 h-3 w-72 max-w-full" />
        <StatCardGridSkeleton cols={4} count={4} />
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-28" />
        <StatCardGridSkeleton cols={2} count={2} />
      </div>
    </div>
  );
}

export function ProductGoalsGridSkeleton() {
  return (
    <div data-testid="product-goals-skeleton" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {GOAL_CARD_SLOTS.map((slot) => (
        <div key={slot} className={cn(PM_PANEL, "space-y-3 border-border/80 bg-card p-4 shadow-sm")}>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-4/5" />
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex justify-between gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function ProductRoadmapSkeleton() {
  return (
    <div data-testid="product-roadmap-skeleton" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {ROADMAP_COLUMN_SLOTS.map((column) => (
        <div key={column} className={cn(PM_PANEL, "min-h-[140px] space-y-2.5 p-2.5")}>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="size-6 rounded-full" />
          </div>
          {ROADMAP_CARD_SLOTS.map((card) => (
            <div key={card} className="space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="size-6 rounded" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center gap-1.5 border-t border-border/70 pt-2.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="ml-auto h-3 w-8" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

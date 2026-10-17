"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { KanbanColumnSkeleton } from "@/components/ui/kanban-skeleton";
import { PM_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Inbox,
  Target,
  TrendingUp,
} from "lucide-react";

const GOAL_CARD_SLOTS = [0, 1, 2, 3, 4, 5] as const;
const ROADMAP_COLUMN_SLOTS = [0, 1, 2, 3] as const;
const ROADMAP_CARD_SLOTS = [0, 1] as const;

function PanelSkeleton({
  titleWidth,
  children,
}: {
  titleWidth: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <Skeleton className={cn("h-4", titleWidth)} />
        <Skeleton className="h-4 w-24" />
      </div>
      {children}
    </section>
  );
}

const IDENTITY_FACT_SLOTS = [0, 1, 2] as const;

export function ManagedProductOverviewSkeleton() {
  return (
      <div
      data-testid="managed-product-overview-skeleton"
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 pb-8"
    >
      <StatCardGridSkeleton
        cols={5}
        count={5}
        className="auto-rows-fr gap-2"
      />
      <PanelSkeleton titleWidth="w-24">
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {IDENTITY_FACT_SLOTS.map((slot) => (
            <Skeleton key={slot} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {GOAL_CARD_SLOTS.slice(0, 5).map((slot) => (
            <div key={slot} className="flex flex-col items-center gap-2">
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </PanelSkeleton>
      <PanelSkeleton titleWidth="w-28">
        <div className="flex flex-col">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-3 dark:border-background sm:flex-row sm:items-center">
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-9 w-full rounded-md sm:w-24" />
          </div>
          {IDENTITY_FACT_SLOTS.slice(0, 2).map((slot) => (
            <div key={slot} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
              <Skeleton className="size-7 shrink-0 rounded-md" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-8 w-24 rounded-md sm:block" />
            </div>
          ))}
        </div>
      </PanelSkeleton>
      <PanelSkeleton titleWidth="w-32">
        <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6">
          {GOAL_CARD_SLOTS.map((slot) => (
            <div key={slot} className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </PanelSkeleton>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PanelSkeleton titleWidth="w-32">
          <div className="grid grid-cols-4 overflow-hidden rounded-lg border border-border dark:border-background">
            {ROADMAP_COLUMN_SLOTS.map((slot) => (
              <div key={slot} className="flex flex-col gap-2 border-r border-border px-2 py-2.5 last:border-r-0 dark:border-background">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
        </PanelSkeleton>
        <PanelSkeleton titleWidth="w-36">
          <div className="flex flex-col gap-3">
            {ROADMAP_COLUMN_SLOTS.map((slot) => (
              <div key={slot} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </PanelSkeleton>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <PanelSkeleton titleWidth="w-36">
          <div className="flex flex-col gap-3">
            {GOAL_CARD_SLOTS.slice(0, 5).map((slot) => (
              <div key={slot} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </PanelSkeleton>
        <PanelSkeleton titleWidth="w-28">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted p-3 dark:border-background">
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </PanelSkeleton>
      </div>
    </div>
  );
}

function LoadingStat({
  label,
  icon,
  tone = "default",
}: {
  label: string;
  icon: typeof Inbox;
  tone?: "default" | "amber" | "blue" | "emerald";
}) {
  return <StatCard label={label} value={0} icon={icon} tone={tone} isLoading />;
}

export function ProductInsightsSkeleton() {
  return (
    <div data-testid="product-insights-skeleton" className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">Where to focus</h2>
        <p className="mt-1 text-sm text-muted-foreground">Activity for the selected range</p>
        <StatCardGrid cols={3} className="mt-4" stackOnMobile>
          <LoadingStat label="Needs triage" icon={Inbox} tone="amber" />
          <LoadingStat label="Planned or underway" icon={Clock} tone="blue" />
          <LoadingStat label="Delivered" icon={CheckCircle2} tone="emerald" />
        </StatCardGrid>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Product context</h2>
        <StatCardGrid cols={2}>
          <LoadingStat label="Days since product update" icon={Clock} />
          <LoadingStat label="Confidence score" icon={CheckCircle2} tone="blue" />
        </StatCardGrid>
      </div>
    </div>
  );
}

export function ProductGoalsStatRow() {
  return (
    <StatCardGrid cols={5}>
      <LoadingStat label="Total Goals" icon={Target} />
      <LoadingStat label="On Track" icon={TrendingUp} tone="emerald" />
      <LoadingStat label="At Risk" icon={AlertTriangle} tone="amber" />
      <LoadingStat label="Avg Progress" icon={TrendingUp} />
      <LoadingStat label="Stale Check-ins" icon={ClipboardCheck} />
    </StatCardGrid>
  );
}

export const PRODUCT_PROJECT_SKELETON_HEADERS = [
  "Project",
  "Status",
  "Health",
  "Next milestone",
  "Next release",
  "Linked goals",
  "Contribution",
  "Dates",
  "Roadmap items",
] as const;

const SETTINGS_FIELDS = [0, 1, 2, 3, 4, 5] as const;

export function ProductSettingsSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-8 pb-12">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Identity, strategy & lifecycle</h2>
        {SETTINGS_FIELDS.map((field) => (
          <div key={field} className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className={cn("h-9 w-full rounded-md", field === 2 && "h-20")} />
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3 border-t border-border pt-8">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <Skeleton className="h-16 w-full rounded-md" />
      </section>
    </div>
  );
}

export function ProductGoalsGridSkeleton() {
  return (
    <div data-testid="product-goals-skeleton" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {GOAL_CARD_SLOTS.map((slot) => (
        <div key={slot} className={cn(PM_PANEL, "flex flex-col gap-3 border-border/80 bg-card p-4 shadow-sm")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-4/5" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border/80 pt-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="ml-auto h-3 w-16" />
              <Skeleton className="ml-auto h-4 w-6" />
            </div>
          </div>
          <Skeleton className="h-3 w-40" />
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

export function ProductRoadmapBoardSkeleton() {
  return (
    <div data-testid="product-roadmap-skeleton" className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
      <KanbanColumnSkeleton />
      <KanbanColumnSkeleton />
      <KanbanColumnSkeleton />
    </div>
  );
}

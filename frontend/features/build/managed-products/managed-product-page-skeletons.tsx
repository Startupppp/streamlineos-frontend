"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { PM_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FolderOpen,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Target,
  ThumbsUp,
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
    <section className="min-w-0 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className={cn("h-4", titleWidth)} />
        <Skeleton className="h-4 w-24" />
      </div>
      {children}
    </section>
  );
}

export function ManagedProductOverviewSkeleton() {
  return (
    <div
      data-testid="managed-product-overview-skeleton"
      className="flex w-full min-w-0 flex-col gap-4 pb-8"
    >
      <Skeleton className="h-4 w-56 max-w-full" />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PanelSkeleton titleWidth="w-32">
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            {ROADMAP_COLUMN_SLOTS.map((slot) => (
              <div key={slot} className="space-y-2 bg-card px-3 py-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-6" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </PanelSkeleton>
        <PanelSkeleton titleWidth="w-36">
          <div className="mt-2 space-y-3">
            {ROADMAP_COLUMN_SLOTS.map((slot) => (
              <div key={slot} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </PanelSkeleton>
      </div>
      <PanelSkeleton titleWidth="w-36">
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GOAL_CARD_SLOTS.slice(0, 5).map((slot) => (
            <div key={slot} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </PanelSkeleton>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Where to focus</h2>
            <p className="text-sm text-muted-foreground">Activity for the selected range</p>
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <StatCardGrid cols={3} className="mt-4" stackOnMobile>
          <LoadingStat label="Needs triage" icon={Inbox} tone="amber" />
          <LoadingStat label="Planned or underway" icon={Clock} tone="blue" />
          <LoadingStat label="Delivered" icon={CheckCircle2} tone="emerald" />
        </StatCardGrid>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Delivery coverage</h2>
        <StatCardGrid cols={3}>
          <LoadingStat label="Linked projects" icon={LayoutGrid} />
          <LoadingStat label="Active" icon={FolderOpen} tone="emerald" />
          <LoadingStat label="Completed" icon={CheckCircle2} tone="blue" />
        </StatCardGrid>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Customer response</h2>
        <StatCardGrid cols={4}>
          <LoadingStat label="Open" icon={Inbox} />
          <LoadingStat label="In progress" icon={BarChart2} tone="amber" />
          <LoadingStat label="Resolved" icon={CheckCircle2} tone="emerald" />
          <LoadingStat label="Archived" icon={FolderOpen} />
        </StatCardGrid>
      </div>
      <div>
        <h2 className="mb-1 text-sm font-medium text-foreground">Evidence linked to the roadmap</h2>
        <p className="mb-3 text-xs text-muted-foreground">Linked feedback posts are distinct from widget submissions above.</p>
        <StatCardGrid cols={4}>
          <LoadingStat label="Roadmap items" icon={LayoutGrid} />
          <LoadingStat label="Completed items" icon={CheckCircle2} tone="blue" />
          <LoadingStat label="Linked feedback" icon={MessageSquare} tone="amber" />
          <LoadingStat label="Feedback votes" icon={ThumbsUp} tone="emerald" />
        </StatCardGrid>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Product context</h2>
        <StatCardGrid cols={2}>
          <LoadingStat label="Days since product update" icon={Clock} />
          <LoadingStat label="Confidence score" icon={CheckCircle2} tone="blue" />
        </StatCardGrid>
      </div>
      <div>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Opportunities</h2>
        <Skeleton className="h-40 w-full rounded-xl" />
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
      <div className="border-t border-border" />
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Members</h2>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </section>
      <div className="border-t border-border" />
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Releases</h2>
        <Skeleton className="h-10 w-full rounded-md" />
      </section>
      <div className="border-t border-border" />
      <section className="flex flex-col gap-3">
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

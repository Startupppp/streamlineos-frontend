"use client";

import { memo, useEffect, useTransition, useState, type ComponentType } from "react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
} from "lucide-react";

import type { MyWorkItem } from "@/types/projects/my-work";

import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { PmPanel, PM_ROW } from "@/components/pm-chrome/pm-chrome";
import {
  FLEX_TITLE_SLOT,
  TEXT_ONE_LINE,
} from "@/lib/text-overflow";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

export type DueBucket = "overdue" | "today" | "upcoming" | "none";

interface WorkRowShape {
  id: number;
  projectId: number;
  projectKey: string;
  projectName: string;
  ticketNumber?: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  dueDate: string | null;
}

export const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "upcoming", "none"];

export const BUCKET_CONFIG: Record<
  DueBucket,
  { label: string; icon: ComponentType<{ className?: string }>; iconClass: string }
> = {
  overdue: { label: "Overdue", icon: AlertCircle, iconClass: "text-status-danger-ink" },
  today: { label: "Due Today", icon: CalendarClock, iconClass: "text-status-warning-ink" },
  upcoming: { label: "Upcoming", icon: Clock, iconClass: "text-primary" },
  none: { label: "No Due Date", icon: CheckCircle2, iconClass: "text-muted-foreground" },
};

export const BUCKET_SYNC_LIMIT = 20;

export const WorkItemRow = memo(function WorkItemRow({
  item,
}: {
  item: WorkRowShape;
  index?: number;
}) {
  return (
    <div className="transition-transform duration-150 hover:translate-x-0.5">
      <Link
        href={
          item.ticketNumber != null
            ? getTicketDetailHref(item.projectId, item.projectKey, item.ticketNumber)
            : `/build/${item.projectId}`
        }
        className={cn(PM_ROW, "gap-2.5")}
      >
        <PriorityBadge priority={item.priority} size="sm" />
        <div className={FLEX_TITLE_SLOT}>
          <p
            className={cn(
              TEXT_ONE_LINE,
              "text-label font-medium leading-tight text-foreground transition-colors group-hover:text-primary",
            )}
            title={item.title}
          >
            {item.title}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
            <span className="shrink-0 font-mono text-micro font-medium text-primary/80">
              {item.projectKey}
            </span>
            <span className="shrink-0 text-micro text-muted-foreground/70">·</span>
            <span
              className={cn(TEXT_ONE_LINE, "min-w-0 flex-1 text-micro text-muted-foreground")}
              title={item.projectName}
            >
              {item.projectName}
            </span>
            <span className="shrink-0 text-micro text-muted-foreground/70">·</span>
            <span className="shrink-0 text-micro text-muted-foreground">{item.type}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={item.status} className="text-dense" />
          <ChevronRight className="h-3 w-3 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </Link>
    </div>
  );
});

export const BucketSection = memo(function BucketSection({
  bucket,
  items,
}: {
  bucket: DueBucket;
  items: MyWorkItem[];
}) {
  const cfg = BUCKET_CONFIG[bucket];
  const [, startTransition] = useTransition();
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(items.length, BUCKET_SYNC_LIMIT),
  );

  useEffect(() => {
    if (items.length > BUCKET_SYNC_LIMIT) {
      startTransition(() => setVisibleCount(items.length));
    } else {
      setVisibleCount(items.length);
    }
  }, [items.length]);

  return (
    <PmPanel>
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        <cfg.icon className={cn("h-3.5 w-3.5 shrink-0", cfg.iconClass)} />
        <span className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
          {cfg.label}
        </span>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-micro font-medium tabular-nums text-primary">
          {items.length}
        </span>
      </div>
      <div>
        {items.slice(0, visibleCount).map((item) => (
          <WorkItemRow key={item.id} item={item} />
        ))}
      </div>
    </PmPanel>
  );
});

export function AllWorkListSkeleton() {
  return (
    <PmPanel className="p-2">
      <div className="space-y-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </PmPanel>
  );
}

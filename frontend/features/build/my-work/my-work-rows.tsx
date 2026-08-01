"use client";

import { memo, useCallback, type ComponentType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useAllWork } from "@/hooks/api/build/all-work";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { AllWorkTicket } from "@/types/projects/tasks";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { StatusBadge } from "@/features/build/shared/status-badge";
import { PmPanel, PM_ROW } from "@/features/build/shared/pm-chrome";
import {
  listItem,
  listItemReduced,
  pmSnappy,
} from "@/features/build/shared/pm-motion";
import {
  FLEX_TITLE_SLOT,
  TEXT_ONE_LINE,
} from "@/lib/text-overflow";
import { getTicketDetailHref } from "@/features/build/shared/format-ticket-key";

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
  overdue: { label: "Overdue", icon: AlertCircle, iconClass: "text-red-600 dark:text-red-400" },
  today: { label: "Due Today", icon: CalendarClock, iconClass: "text-amber-600 dark:text-amber-400" },
  upcoming: { label: "Upcoming", icon: Clock, iconClass: "text-primary" },
  none: { label: "No Due Date", icon: CheckCircle2, iconClass: "text-muted-foreground" },
};

export const WorkItemRow = memo(function WorkItemRow({
  item,
}: {
  item: WorkRowShape;
  index?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      whileHover={shouldReduceMotion ? undefined : { x: 2 }}
    >
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
              "text-[13px] font-medium leading-tight text-foreground transition-colors group-hover:text-primary",
            )}
            title={item.title}
          >
            {item.title}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
            <span className="shrink-0 font-mono text-[10px] font-medium text-primary/80">
              {item.projectKey}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground/70">·</span>
            <span
              className={cn(TEXT_ONE_LINE, "min-w-0 flex-1 text-[10px] text-muted-foreground")}
              title={item.projectName}
            >
              {item.projectName}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground/70">·</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{item.type}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={item.status} className="text-[11px]" />
          <ChevronRight className="h-3 w-3 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </Link>
    </motion.div>
  );
});

export function BucketSection({
  bucket,
  items,
}: {
  bucket: DueBucket;
  items: MyWorkItem[];
}) {
  const cfg = BUCKET_CONFIG[bucket];
  const shouldReduceMotion = useReducedMotion();

  return (
    <PmPanel>
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        <cfg.icon className={cn("h-3.5 w-3.5 shrink-0", cfg.iconClass)} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {cfg.label}
        </span>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
          {items.length}
        </span>
      </div>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: shouldReduceMotion
              ? { duration: 0 }
              : { staggerChildren: 0.03, delayChildren: 0.04 },
          },
        }}
      >
        {items.map((item) => (
          <WorkItemRow key={item.id} item={item} />
        ))}
      </motion.div>
    </PmPanel>
  );
}

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

function AllWorkList({
  items,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyDescription,
}: {
  items: AllWorkTicket[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (isLoading) {
    return <AllWorkListSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        className="min-h-[14rem]"
        title="Failed to load tickets"
        description="Could not fetch tickets. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        illustrationPreset="projects"
        title={emptyTitle}
        description={emptyDescription}
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <PmPanel>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: shouldReduceMotion
              ? { duration: 0 }
              : { staggerChildren: 0.03, delayChildren: 0.04 },
          },
        }}
      >
        {items.map((item) => (
          <WorkItemRow key={item.id} item={item} />
        ))}
      </motion.div>
    </PmPanel>
  );
}


"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CalendarClock, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { useMyWork } from "@/hooks/api/projects/my-work";
import type { MyWorkItem } from "@/types/projects/my-work";
import { cn } from "@/lib/utils";
import { isPast, isToday, parseISO } from "date-fns";

type DueBucket = "overdue" | "today" | "upcoming" | "none";

const PRIORITY_CLASS: Record<string, string> = {
  URGENT: "text-red-600 border-red-300 bg-red-50",
  HIGH: "text-orange-600 border-orange-300 bg-orange-50",
  MEDIUM: "text-amber-600 border-amber-300 bg-amber-50",
  LOW: "text-slate-600 border-slate-300 bg-slate-100",
};

const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "upcoming", "none"];

const BUCKET_CONFIG: Record<DueBucket, { label: string; icon: React.ComponentType<{ className?: string }>; iconClass: string }> = {
  overdue: { label: "Overdue", icon: AlertCircle, iconClass: "text-red-600" },
  today: { label: "Due Today", icon: CalendarClock, iconClass: "text-amber-600" },
  upcoming: { label: "Upcoming", icon: Clock, iconClass: "text-blue-600" },
  none: { label: "No Due Date", icon: CheckCircle2, iconClass: "text-muted-foreground" },
};

function getDueBucket(item: MyWorkItem): DueBucket {
  if (!item.dueDate) return "none";
  try {
    const d = parseISO(item.dueDate);
    if (isToday(d)) return "today";
    if (isPast(d)) return "overdue";
    return "upcoming";
  } catch {
    return "none";
  }
}

function WorkItemRow({ item, index }: { item: MyWorkItem; index: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: "easeOut" }}
    >
      <Link
        href={`/projects/${item.projectId}?ticket=${item.id}`}
        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors group border border-transparent hover:border-border/50"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate font-medium">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-blue-600 font-medium">
              {item.projectKey}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {item.projectName}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{item.type}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.priority && PRIORITY_CLASS[item.priority] && (
            <Badge
              variant="outline"
              className={cn("text-[10px] py-0 h-4 px-1.5", PRIORITY_CLASS[item.priority])}
            >
              {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
            {item.status.replace(/_/g, " ")}
          </Badge>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
    </motion.div>
  );
}

function BucketSection({ bucket, items }: { bucket: DueBucket; items: MyWorkItem[] }) {
  const cfg = BUCKET_CONFIG[bucket];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-1.5">
        <cfg.icon className={cn("h-3.5 w-3.5", cfg.iconClass)} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {cfg.label}
        </span>
        <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 tabular-nums">
          {items.length}
        </span>
      </div>
      {items.map((item, i) => (
        <WorkItemRow key={item.id} item={item} index={i} />
      ))}
    </div>
  );
}

export function MyWorkPage() {
  const { data, isLoading, isError, refetch } = useMyWork();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const grouped = useMemo(() => {
    if (!data) return null;
    const buckets: Record<DueBucket, MyWorkItem[]> = { overdue: [], today: [], upcoming: [], none: [] };
    for (const item of data) {
      buckets[getDueBucket(item)].push(item);
    }
    return buckets;
  }, [data]);

  const totalOpen = useMemo(
    () => data?.filter((i) => i.status !== "DONE" && i.status !== "CANCELLED").length ?? 0,
    [data],
  );

  return (
    <PageWrapper
      title="My Work"
      subtitle="Your assigned tickets across all projects"
      badge={isLoading ? undefined : String(totalOpen)}
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load your work"
          description="Could not fetch your assigned tickets. Please try again."
          onRetry={handleRetry}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          illustrationPreset="projects"
          title="Nothing assigned to you"
          description="Tickets assigned to you across all projects will appear here."
          className="min-h-[40vh]"
        />
      ) : (
        <div className="space-y-5">
          {BUCKET_ORDER.map((bucket) => {
            const items = grouped?.[bucket] ?? [];
            if (items.length === 0) return null;
            return <BucketSection key={bucket} bucket={bucket} items={items} />;
          })}
        </div>
      )}
    </PageWrapper>
  );
}

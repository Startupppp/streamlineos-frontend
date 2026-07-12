"use client";

import { memo, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CalendarClock, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { useMyWork } from "@/hooks/api/projects/my-work";
import { useAllWork } from "@/hooks/api/projects/all-work";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { AllWorkTicket } from "@/types/projects/tasks";
import { cn } from "@/lib/utils";
import { isPast, isToday, parseISO } from "date-fns";

type DueBucket = "overdue" | "today" | "upcoming" | "none";
type WorkTab = "assigned" | "created" | "subscribed" | "recent";

interface WorkRowShape {
  id: number;
  projectId: number;
  projectKey: string;
  projectName: string;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  dueDate: string | null;
}

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

const TAB_CONFIG: Record<WorkTab, { label: string }> = {
  assigned: { label: "Assigned" },
  created: { label: "Created" },
  subscribed: { label: "Subscribed" },
  recent: { label: "Recent" },
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

const WorkItemRow = memo(function WorkItemRow({ item, index }: { item: WorkRowShape; index: number }) {
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
});

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

function AllWorkList({ items, isLoading, isError, onRetry, emptyTitle, emptyDescription }: {
  items: AllWorkTicket[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
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
        className="min-h-[40vh]"
      />
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <WorkItemRow key={item.id} item={item} index={i} />
      ))}
    </div>
  );
}

function CreatedTab() {
  const { data, isLoading, isError, refetch } = useAllWork({ scope: "created", orderBy: "created", orderDir: "desc", limit: 50 });
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <AllWorkList
      items={data?.data}
      isLoading={isLoading}
      isError={isError}
      onRetry={handleRetry}
      emptyTitle="No tickets created by you"
      emptyDescription="Tickets you reported or created across all projects will appear here."
    />
  );
}

function SubscribedTab() {
  const { data, isLoading, isError, refetch } = useAllWork({ scope: "subscribed", orderBy: "updated", orderDir: "desc", limit: 50 });
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <AllWorkList
      items={data?.data}
      isLoading={isLoading}
      isError={isError}
      onRetry={handleRetry}
      emptyTitle="No subscribed tickets"
      emptyDescription="Tickets you are watching will appear here."
    />
  );
}

function RecentTab() {
  const { data, isLoading, isError, refetch } = useAllWork({ scope: "mine", orderBy: "updated", orderDir: "desc", limit: 50 });
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <AllWorkList
      items={data?.data}
      isLoading={isLoading}
      isError={isError}
      onRetry={handleRetry}
      emptyTitle="No recently updated tickets"
      emptyDescription="Your recently updated assigned tickets will appear here."
    />
  );
}

export function MyWorkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: WorkTab = rawTab === "created" || rawTab === "subscribed" || rawTab === "recent" ? rawTab : "assigned";

  const { data, isLoading, isError, refetch } = useMyWork();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "assigned") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

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

  const bucketCounts = useMemo(() => {
    if (!grouped) return { overdue: 0, today: 0, upcoming: 0 };
    return {
      overdue: grouped.overdue.length,
      today: grouped.today.length,
      upcoming: grouped.upcoming.length,
    };
  }, [grouped]);

  return (
    <PageWrapper
      title="My Work"
      eyebrow="Projects"
      subtitle="Your assigned tickets across all projects"
    >
      {activeTab === "assigned" && !isLoading && !isError && data && data.length > 0 && (
        <StatCardGrid cols={4} className="mb-4">
          <StatCard label="Open" value={totalOpen} icon={CheckCircle2} tone="blue" />
          <StatCard label="Overdue" value={bucketCounts.overdue} icon={AlertCircle} tone={bucketCounts.overdue > 0 ? "red" : "default"} />
          <StatCard label="Due Today" value={bucketCounts.today} icon={CalendarClock} tone="amber" />
          <StatCard label="Upcoming" value={bucketCounts.upcoming} icon={Clock} tone="emerald" />
        </StatCardGrid>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          {(Object.keys(TAB_CONFIG) as WorkTab[]).map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_CONFIG[tab].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTab === "assigned" && (
          isLoading ? (
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
          )
        )}

        {activeTab === "created" && <CreatedTab />}
        {activeTab === "subscribed" && <SubscribedTab />}
        {activeTab === "recent" && <RecentTab />}
      </Tabs>
    </PageWrapper>
  );
}

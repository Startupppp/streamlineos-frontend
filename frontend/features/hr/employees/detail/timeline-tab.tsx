"use client";

import { useEmployeeEmployment, useEmployeeTimeline } from "@/hooks/api/hr/employees";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { usePageState } from "@/hooks/api/use-page-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { GitBranch, Clock, FileText, AlertCircle } from "lucide-react";
import type { HrTimelineEntry } from "@/types/hr/core";

function entryIcon(type: HrTimelineEntry["type"]) {
  if (type === "status_transition") return GitBranch;
  if (type === "effective_change") return Clock;
  return FileText;
}

function entryColor(type: HrTimelineEntry["type"]) {
  if (type === "status_transition") return "bg-primary/10 text-primary";
  if (type === "effective_change") return "bg-status-warning-surface text-status-warning-ink";
  return "bg-muted text-muted-foreground";
}

interface Props {
  userId: string;
}

export function EmployeeTimelineTab({ userId }: Props) {
  const employmentQuery = useEmployeeEmployment(userId);
  const timelineQuery = useEmployeeTimeline(employmentQuery.data?.id);
  const employment = employmentQuery.data;
  const entries = timelineQuery.data?.pages.flatMap((page) => page.data) ?? [];

  // Both reads are gated on hr:employees:view; a denied caller must see the
  // refusal, not "No timeline events yet" (FE-47).
  const pageState = usePageState({
    permission: "hr:employees:view",
    isLoading: employmentQuery.isLoading || timelineQuery.isLoading,
    isError: employmentQuery.isError || timelineQuery.isError,
    error: employmentQuery.error ?? timelineQuery.error,
    isEmpty: !employment || entries.length === 0,
  });

  function handleRetry(): void {
    void employmentQuery.refetch();
    if (employment) void timelineQuery.refetch();
  }

  function handleLoadMore(): void {
    void timelineQuery.fetchNextPage();
  }

  return (
    <PageState
      resolution={pageState}
      compact
      onRetry={handleRetry}
      loading={
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      }
      empty={
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {employment ? (
            <>
              <Clock className="w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No timeline events yet</p>
              <p className="text-xs text-muted-foreground mt-1">Changes and events will appear here as they occur.</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No employment record found for this employee.</p>
            </>
          )}
        </div>
      }
    >
      <TimelineEntries entries={entries} />
      <InfiniteScrollSentinel
        hasNextPage={Boolean(timelineQuery.hasNextPage)}
        isFetchingNextPage={timelineQuery.isFetchingNextPage}
        onLoadMore={handleLoadMore}
        label="Load older events"
      />
    </PageState>
  );
}

function TimelineEntries({ entries }: { entries: HrTimelineEntry[] }) {
  return (
    <div className="relative space-y-0 pb-4">
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
      {entries.map((entry, idx) => {
        const Icon = entryIcon(entry.type);
        const colorClass = entryColor(entry.type);
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx, 6) * 0.05, duration: 0.2, ease: "easeOut" }}
            className="relative flex gap-4 pb-4"
          >
            <div className={cn("relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <Card className="flex-1 rounded-2xl border border-border/70 bg-card/90 shadow-card">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <TruncatedText text={entry.action} className="text-sm font-medium text-foreground leading-snug min-w-0 flex-1" />
                  <span className="shrink-0 text-dense text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                {entry.data && Object.keys(entry.data).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 min-w-0">
                    {Object.entries(entry.data)
                      .filter(([, v]) => v != null && v !== "")
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <span key={k} className="text-dense text-muted-foreground break-words max-w-[18rem]">
                          <span className="font-medium capitalize">{k.replace(/([A-Z])/g, " $1").trim()}: </span>
                          {String(v)}
                        </span>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

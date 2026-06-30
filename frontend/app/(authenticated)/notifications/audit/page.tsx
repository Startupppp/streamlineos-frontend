"use client";

import { useState, useCallback } from "react";
import { Activity, ClipboardList, ChevronLeft, ChevronRight, X } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useNotificationAuditLogs } from "@/hooks/api/notifications";
import { formatRelativeTime } from "@/features/notifications/format-relative-time";
import type { NotificationAuditLog } from "@/types/notifications";

const PAGE_SIZE = 25;

const KNOWN_ACTIONS = [
  "notification.created",
  "notification.read",
  "notification.all_read",
  "notification.archived",
  "notification.unarchived",
  "notification.deleted",
  "notification.pinned",
  "notification.unpinned",
  "notification.snoozed",
  "notification.bulk_read",
  "notification.bulk_archived",
  "notification.bulk_deleted",
  "notification.clear_all",
  "template.created",
  "template.updated",
  "template.deleted",
  "broadcast.created",
  "broadcast.published",
  "broadcast.cancelled",
  "preference.updated",
];

function getActionStyle(action: string): { bg: string; color: string } {
  if (action.startsWith("notification.")) return { bg: "bg-blue-50", color: "text-blue-600" };
  if (action.startsWith("template.")) return { bg: "bg-indigo-50", color: "text-indigo-600" };
  if (action.startsWith("broadcast.")) return { bg: "bg-purple-50", color: "text-purple-600" };
  if (action.startsWith("preference.")) return { bg: "bg-amber-50", color: "text-amber-600" };
  return { bg: "bg-muted", color: "text-muted-foreground" };
}

function AuditRow({ log }: { log: NotificationAuditLog }) {
  const { bg, color } = getActionStyle(log.action);
  const actor = log.actorName ?? log.actorEmail ?? "System";

  return (
    <div className="group flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5", bg)}>
        <Activity className={cn("h-4 w-4", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] h-4 px-1.5 rounded-full bg-muted text-muted-foreground font-mono inline-flex items-center shrink-0">
            {log.action}
          </span>
          {log.notificationId && (
            <span className="text-[10px] h-4 px-1.5 rounded-full border border-border text-muted-foreground inline-flex items-center shrink-0">
              #{log.notificationId}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{actor}</p>
      </div>
      <span className="text-[11px] text-muted-foreground/60 shrink-0 mt-0.5 whitespace-nowrap">
        {formatRelativeTime(log.createdAt)}
      </span>
    </div>
  );
}

function AuditListSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-3 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function NotificationAuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data, isLoading, isError, refetch } = useNotificationAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    action,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const hasFilters = !!action || !!dateFrom || !!dateTo;

  const handleActionChange = useCallback((value: string) => {
    setAction(value === "ALL" ? undefined : value);
    setPage(1);
  }, []);

  const handleDateFrom = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
    setPage(1);
  }, []);

  const handleDateTo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setAction(undefined);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const handlePrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNext = useCallback(() => setPage((p) => p + 1), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Track all notification platform events"
      filters={
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={action ?? "ALL"} onValueChange={handleActionChange}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              {KNOWN_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="date"
            value={dateFrom}
            onChange={handleDateFrom}
            className="flex h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={handleDateTo}
            className="flex h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="To"
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={handleClearFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        {isLoading ? (
          <AuditListSkeleton />
        ) : isError ? (
          <ErrorState
            title="Failed to load audit log"
            description="We couldn't load the audit events. Please try again."
            onRetry={handleRetry}
          />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm font-medium text-foreground">No audit events</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilters ? "Try adjusting your filters." : "Notification events will appear here."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {logs.map((log: NotificationAuditLog) => (
              <AuditRow key={log.id} log={log} />
            ))}
          </div>
        )}

        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {data?.total ?? 0} events
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handlePrev}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleNext}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

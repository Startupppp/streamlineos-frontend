"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { ActivityCard } from "@/features/crm/activities/activity-card";
import { ActivityFilters } from "@/features/crm/activities/activity-filters";
import { LogActivityDialog } from "@/features/crm/activities/log-activity-dialog";
import { ActivitiesStatsBar } from "@/features/crm/activities/activities-stats-bar";
import {
  useCrmActivities,
  useLogCrmActivity,
} from "@/hooks/api/crm/crm-activities";
import type {
  CrmActivityType,
  CrmActivityEntityType,
  CrmActivityStatus,
  LogCrmActivityInput,
} from "@/hooks/api/crm/crm-activities";
import { toast } from "sonner";
import { isPast, isToday } from "date-fns";

const PAGE_SIZE = 30;

function isCrmActivityType(v: string): v is CrmActivityType {
  return ["CALL", "EMAIL", "MEETING", "CUSTOM"].includes(v);
}

function isCrmEntityType(v: string): v is CrmActivityEntityType {
  return ["LEAD", "DEAL", "CONTACT"].includes(v);
}

function isCrmActivityStatus(v: string): v is CrmActivityStatus {
  return ["pending", "completed", "cancelled"].includes(v);
}

function ActivitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const rawType       = searchParams.get("type") ?? "";
  const rawEntityType = searchParams.get("entityType") ?? "";
  const rawStatus     = searchParams.get("status") ?? "";
  const rawPage       = parseInt(searchParams.get("page") ?? "1", 10);
  const page          = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const typeFilter:       CrmActivityType | ""       = isCrmActivityType(rawType)     ? rawType       : "";
  const entityTypeFilter: CrmActivityEntityType | "" = isCrmEntityType(rawEntityType) ? rawEntityType : "";
  const statusFilter:     CrmActivityStatus | ""     = isCrmActivityStatus(rawStatus) ? rawStatus     : "";

  const hasActiveFilters = !!(typeFilter || entityTypeFilter || statusFilter || search);

  const handleTypeChange = useCallback(
    (v: CrmActivityType | "") => {
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set("type", v); else params.delete("type");
      params.delete("page");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleEntityTypeChange = useCallback(
    (v: CrmActivityEntityType | "") => {
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set("entityType", v); else params.delete("entityType");
      params.delete("page");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleStatusChange = useCallback(
    (v: CrmActivityStatus | "") => {
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set("status", v); else params.delete("status");
      params.delete("page");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleSearchChange = useCallback((v: string) => setSearch(v), []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    router.replace("?", { scroll: false });
  }, [router]);

  const { data, isLoading, isError, refetch } = useCrmActivities({
    type:       typeFilter       || undefined,
    entityType: entityTypeFilter || undefined,
    status:     statusFilter     || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const { data: totalStats,   isLoading: statsLoading }    = useCrmActivities({ limit: 1 });
  const { data: callStats,    isLoading: callsLoading }    = useCrmActivities({ type: "CALL",    limit: 1 });
  const { data: emailStats,   isLoading: emailsLoading }   = useCrmActivities({ type: "EMAIL",   limit: 1 });
  const { data: meetingStats, isLoading: meetingsLoading } = useCrmActivities({ type: "MEETING", limit: 1 });

  const pendingCount = useMemo(() => {
    if (!data?.tasks) return 0;
    return data.tasks.filter(
      (t) =>
        t.status === "pending" &&
        t.dueDate &&
        isPast(new Date(t.dueDate)) &&
        !isToday(new Date(t.dueDate)),
    ).length;
  }, [data?.tasks]);

  const filteredActivities = useMemo(() => {
    if (!data?.tasks) return [];
    if (!search) return data.tasks;
    const q = search.toLowerCase();
    return data.tasks.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.notes?.toLowerCase().includes(q) ?? false),
    );
  }, [data?.tasks, search]);

  const logActivity = useLogCrmActivity();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);
  const handleCloseDialog = useCallback(() => setDialogOpen(false), []);

  const handleLogActivity = useCallback(
    (input: LogCrmActivityInput) => {
      logActivity.mutate(input, {
        onSuccess: () => {
          toast.success("Activity logged successfully");
          setDialogOpen(false);
        },
        onError: (err) => toast.error(err.message),
      });
    },
    [logActivity],
  );

  const handlePrev = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const prev = page - 1;
    if (prev <= 1) params.delete("page"); else params.set("page", String(prev));
    router.push(`?${params.toString()}`, { scroll: false });
  }, [page, searchParams, router]);

  const handleNext = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page + 1));
    router.push(`?${params.toString()}`, { scroll: false });
  }, [page, searchParams, router]);

  const totalCount  = data?.total ?? 0;
  const totalPages  = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const statsIsLoading = statsLoading || callsLoading || emailsLoading || meetingsLoading;

  return (
    <PageWrapper
      title="Activities"
      subtitle={!isLoading && data ? `${totalCount} activities` : undefined}
      badge={!isLoading && data ? String(totalCount) : undefined}
      actions={
        <Button onClick={handleOpenDialog} size="sm" className="h-8 px-3 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Log Activity
        </Button>
      }
      filters={
        <ActivityFilters
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          entityTypeFilter={entityTypeFilter}
          statusFilter={statusFilter}
          onTypeChange={handleTypeChange}
          onEntityTypeChange={handleEntityTypeChange}
          onStatusChange={handleStatusChange}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      }
    >
      <div className="space-y-4">
        <ActivitiesStatsBar
          total={totalStats?.total ?? 0}
          calls={callStats?.total ?? 0}
          emails={emailStats?.total ?? 0}
          meetings={meetingStats?.total ?? 0}
          pending={pendingCount}
          isLoading={statsIsLoading}
        />

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <ErrorState
            title="Failed to load activities"
            description="Could not load activities. Please try again."
            onRetry={handleRetry}
            className="flex-1 min-h-[300px]"
          />
        )}

        {!isLoading && !isError && filteredActivities.length === 0 && (
          <EmptyState
            illustration={<EmptyActivityIllustration />}
            title={hasActiveFilters ? "No results found" : "No activities yet"}
            description={
              hasActiveFilters
                ? "No results match your filters."
                : "Log your first call, email, or meeting to get started."
            }
            action={
              hasActiveFilters
                ? { label: "Clear filters", onClick: handleClearFilters }
                : { label: "Log Activity", onClick: handleOpenDialog }
            }
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        )}

        {!isLoading && !isError && filteredActivities.length > 0 && (
          <>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredActivities.map((activity, idx) => (
                  <ActivityCard key={activity.id} activity={activity} index={idx} />
                ))}
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground tabular-nums">
                  Page {page} of {totalPages} · {totalCount} total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={page <= 1}
                    className="h-7 px-3 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={page >= totalPages}
                    className="h-7 px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <LogActivityDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleLogActivity}
        isPending={logActivity.isPending}
      />
    </PageWrapper>
  );
}

export default function CrmActivitiesPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper title="Activities">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </PageWrapper>
      }
    >
      <ActivitiesContent />
    </Suspense>
  );
}

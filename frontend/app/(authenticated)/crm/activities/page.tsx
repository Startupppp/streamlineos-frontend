"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
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

  const rawType       = searchParams.get("type") ?? "";
  const rawEntityType = searchParams.get("entityType") ?? "";
  const rawStatus     = searchParams.get("status") ?? "";
  const rawPage       = parseInt(searchParams.get("page") ?? "1", 10);
  const page          = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const typeFilter:       CrmActivityType | ""       = isCrmActivityType(rawType)       ? rawType       : "";
  const entityTypeFilter: CrmActivityEntityType | "" = isCrmEntityType(rawEntityType)   ? rawEntityType : "";
  const statusFilter:     CrmActivityStatus | ""     = isCrmActivityStatus(rawStatus)   ? rawStatus     : "";

  const hasActiveFilters = !!(typeFilter || entityTypeFilter || statusFilter);

  const handleTypeChange = useCallback(
    (v: CrmActivityType | "") => {
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set("type", v); else params.delete("type");
      params.delete("page");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleEntityTypeChange = useCallback(
    (v: CrmActivityEntityType | "") => {
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set("entityType", v); else params.delete("entityType");
      params.delete("page");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleStatusChange = useCallback(
    (v: CrmActivityStatus | "") => {
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set("status", v); else params.delete("status");
      params.delete("page");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleClearFilters = useCallback(() => {
    router.push("?", { scroll: false });
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

  const logActivity = useLogCrmActivity();

  const handleOpenDialog = useCallback(() => setDialogOpen(true),  []);
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
      subtitle="All CRM interactions and follow-ups across leads, deals, and contacts"
      badge={!isLoading && data ? String(totalCount) : undefined}
      actions={
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleOpenDialog}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 h-8 px-3 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Activity
          </Button>
        </motion.div>
      }
      filters={
        <ActivityFilters
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
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] gap-3">
            <p className="text-sm text-muted-foreground">Failed to load activities.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && data?.tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center min-h-[400px] gap-4"
          >
            <div className="rounded-full bg-violet-500/10 p-4">
              <Activity className="h-8 w-8 text-violet-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">No activities yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters
                  ? "Try adjusting the filters above"
                  : "Log your first call, email, or meeting to get started"}
              </p>
            </div>
            {!hasActiveFilters && (
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleOpenDialog}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Log Activity
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {!isLoading && !isError && data && data.tasks.length > 0 && (
          <>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {data.tasks.map((activity, idx) => (
                  <ActivityCard key={activity.id} activity={activity} index={idx} />
                ))}
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.3 }}
                className="flex items-center justify-between pt-2"
              >
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
              </motion.div>
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
        <PageWrapper title="Activities" subtitle="All CRM interactions and follow-ups">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </PageWrapper>
      }
    >
      <ActivitiesContent />
    </Suspense>
  );
}

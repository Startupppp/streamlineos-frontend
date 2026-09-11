"use client";

import { useState, useCallback, useMemo, Suspense, type MouseEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { RecordList, type RecordValue } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  activityLayoutWithTypes,
  activityRecordFields,
  activityStatus,
  activityTypeOptions,
} from "@/lib/renderer/crm/activity-layout";
import { ActivityFilters } from "@/features/crm/activities/activity-filters";
import { LogActivityDialog } from "@/features/crm/activities/log-activity-dialog";
import { ActivitiesStatsBar } from "@/features/crm/activities/activities-stats-bar";
import { useCan } from "@/hooks/api/access";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import {
  useCompleteCrmActivity,
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
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * Activities.
 *
 * A queue, not a timeline. The distinction decided how this screen is built: a
 * timeline is a narrative about one record read downward, and the CRM has one of
 * those under `features/crm/timeline`. This is a filterable, paginated list of
 * work with a status, a due date and a thing you do to it — which is a record
 * list, so no table is written here. `ACTIVITY_LAYOUT` supplies the columns, the
 * status tone, the notes riding under each title and the mobile card; the page
 * supplies the filters, the "done" control and which of the four states the
 * reader is in.
 *
 * The cards this replaces stacked title, badges, notes and three dates into a
 * block per row — twenty activities filled a screen. The same twenty now fit
 * where five did, and the state that was previously missing outright, a query
 * still in flight, no longer renders as "No activities yet".
 */

const PAGE_SIZE = 30;

const ENTITY_PATHS: Record<CrmActivityEntityType, string> = {
  LEAD: "/crm/leads",
  DEAL: "/crm/deals",
  CONTACT: "/crm/contacts",
};

function isCrmActivityType(v: string): v is CrmActivityType {
  return v === "CALL" || v === "EMAIL" || v === "MEETING" || v === "CUSTOM";
}

function isCrmEntityType(v: string): v is CrmActivityEntityType {
  return v === "LEAD" || v === "DEAL" || v === "CONTACT";
}

function isCrmActivityStatus(v: string): v is CrmActivityStatus {
  return v === "pending" || v === "completed" || v === "cancelled";
}

interface ActivityRowActionsProps {
  activityId: number;
  status: string;
  isPending: boolean;
  onComplete: (activityId: number) => void;
}

/**
 * The one thing a row can have done to it.
 *
 * A component rather than markup inline in the cell, because the cell is a
 * callback and a callback cannot hold a handler bound to its row without
 * rebuilding every other row's handler with it.
 */
function ActivityRowActions({
  activityId,
  status,
  isPending,
  onComplete,
}: ActivityRowActionsProps) {
  /* The row navigates to the linked record, so the button must not do both. */
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onComplete(activityId);
    },
    [activityId, onComplete],
  );

  if (status === "completed" || status === "cancelled") return null;

  return (
    <LoadingButton
      variant="ghost"
      size="sm"
      className="h-7 w-7 px-0"
      isPending={isPending}
      onClick={handleClick}
      aria-label="Mark activity done"
    >
      <CheckCheck className="h-3.5 w-3.5" />
    </LoadingButton>
  );
}

function ActivitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [density, setDensity] = useDensity();

  const canViewActivities = useCan("tasks:read");

  const rawType = searchParams.get("type") ?? "";
  const rawEntityType = searchParams.get("entityType") ?? "";
  const rawStatus = searchParams.get("status") ?? "";
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const typeFilter: CrmActivityType | "" = isCrmActivityType(rawType) ? rawType : "";
  const entityTypeFilter: CrmActivityEntityType | "" = isCrmEntityType(rawEntityType)
    ? rawEntityType
    : "";
  const statusFilter: CrmActivityStatus | "" = isCrmActivityStatus(rawStatus) ? rawStatus : "";

  const hasActiveFilters = !!(typeFilter || entityTypeFilter || statusFilter || search);

  const { data: crmOptions } = useCrmOptions("activity_type");
  const description = useMemo(
    () => activityLayoutWithTypes(activityTypeOptions(crmOptions)),
    [crmOptions],
  );
  const layout = useTenantLayout(description);

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

  const handlePageChange = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) params.delete("page"); else params.set("page", String(next));
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const { data, isLoading, isError, refetch } = useCrmActivities({
    type: typeFilter || undefined,
    entityType: entityTypeFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const { data: totalStats, isLoading: statsLoading } = useCrmActivities({ limit: 1 });
  const { data: callStats, isLoading: callsLoading } = useCrmActivities({ type: "CALL", limit: 1 });
  const { data: emailStats, isLoading: emailsLoading } = useCrmActivities({ type: "EMAIL", limit: 1 });
  const { data: meetingStats, isLoading: meetingsLoading } = useCrmActivities({ type: "MEETING", limit: 1 });

  const overdueCount = useMemo(
    () => (data?.tasks ?? []).filter((task) => activityStatus(task) === "overdue").length,
    [data?.tasks],
  );

  const rows = useMemo<RecordValue[]>(() => {
    const shaped = (data?.tasks ?? []).map(activityRecordFields);
    if (!search) return shaped;
    const query = search.toLowerCase();
    return shaped.filter((row) => {
      const title = typeof row.title === "string" ? row.title.toLowerCase() : "";
      const notes = typeof row.notes === "string" ? row.notes.toLowerCase() : "";
      return title.includes(query) || notes.includes(query);
    });
  }, [data?.tasks, search]);

  const logActivity = useLogCrmActivity();
  const complete = useCompleteCrmActivity();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);
  const handleCloseDialog = useCallback(() => setDialogOpen(false), []);

  const handleComplete = useCallback(
    (activityId: number) => {
      complete.mutate(activityId, {
        onSuccess: () => toast.success("Activity marked as complete"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [complete],
  );

  const handleLogActivity = useCallback(
    (input: LogCrmActivityInput) => {
      logActivity.mutate(input, {
        onSuccess: () => {
          toast.success("Activity logged successfully");
          setDialogOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [logActivity],
  );

  const handleRowClick = useCallback(
    (row: RecordValue) => {
      const entityType = typeof row.entityType === "string" ? row.entityType : null;
      if (!entityType || !isCrmEntityType(entityType)) return;
      if (row.entityId === null || row.entityId === undefined) return;
      router.push(`${ENTITY_PATHS[entityType]}/${String(row.entityId)}`);
    },
    [router],
  );

  const renderActions = useCallback(
    (row: RecordValue) => (
      <ActivityRowActions
        activityId={Number(row.id)}
        status={String(row.status)}
        isPending={complete.isPending && complete.variables === Number(row.id)}
        onComplete={handleComplete}
      />
    ),
    [complete.isPending, complete.variables, handleComplete],
  );

  const statsIsLoading = statsLoading || callsLoading || emailsLoading || meetingsLoading;

  return (
    <PageWrapper
      title="Activities"
      subtitle="Track calls, emails, meetings, and tasks across your pipeline"
      actions={
        <Button onClick={handleOpenDialog} size="sm" className="px-3 text-xs gap-1.5">
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
          trailing={<DensityToggle density={density} onChange={setDensity} />}
        />
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <ActivitiesStatsBar
          total={totalStats?.total ?? 0}
          calls={callStats?.total ?? 0}
          emails={emailStats?.total ?? 0}
          meetings={meetingStats?.total ?? 0}
          pending={overdueCount}
          isLoading={statsIsLoading}
        />

        {!canViewActivities ? (
          <NoPermissionState permission="tasks:read" className="flex-1" />
        ) : isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load activities"
            description="The activity list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={<EmptyActivityIllustration />}
            title={hasActiveFilters ? "No activities match these filters" : "No activities yet"}
            description={
              hasActiveFilters
                ? "Nothing here matches what you have filtered to. Clear the filters to see the whole queue."
                : "Log your first call, email or meeting and it lands here with a due date you can work from."
            }
            action={
              hasActiveFilters
                ? { label: "Clear filters", onClick: handleClearFilters }
                : { label: "Log Activity", onClick: handleOpenDialog }
            }
            actionVariant={hasActiveFilters ? "outline" : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={rows}
            getRowKey={(row) => String(row.id)}
            actions={renderActions}
            onRowClick={handleRowClick}
            density={density}
            minWidth="900px"
            className={CONTENT_FILL_PANEL}
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              onPageChange: handlePageChange,
            }}
          />
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
          <DataTableSkeleton rows={12} columns={6} className="flex-1" />
        </PageWrapper>
      }
    >
      <ActivitiesContent />
    </Suspense>
  );
}

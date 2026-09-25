"use client";

import { useCallback, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { AlertTriangle } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { StateIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import {
  useEmergencyEvents,
  type EmergencyEvent,
  type EmergencyEventStatus,
} from "@/hooks/api/hr/enterprise-ops-emergency";
import { EmergencyEventSheet } from "./emergency-event-sheet";
import { EmergencyEventDetail } from "./emergency-event-detail";
import { format } from "date-fns";

const STATUS_COLORS: Record<EmergencyEventStatus, string> = {
  active: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  resolved: "bg-status-success-surface text-status-success-ink border-status-success-rule",
};

export function EmergencyPageContent() {
  const canManage = useCan("hr:emergency:manage");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } = useEmergencyEvents({ cursor });

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);

  const pageState = usePageState({
    permission: "hr:emergency:manage",
    isLoading,
    isError,
    error,
  });

  const columns: DataTableColumn<EmergencyEvent>[] = [
    {
      key: "name",
      header: "Event",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-warning-ink shrink-0" />
          <span className="text-sm font-medium text-foreground">{r.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (r) => (
        <span className="text-sm text-muted-foreground capitalize">
          {r.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[r.status]}`}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(r.createdAt), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
  ];

  if (selectedId) {
    return <EmergencyEventDetail eventId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <>
      <PageWrapper
        title="Emergency Management"
        subtitle="Declare emergency events and track employee safety responses"
        actions={
          canManage ? (
            <Button size="sm" onClick={handleOpenCreate}>
              <PlusIcon size={16} className="mr-1.5" />
              Declare Event
            </Button>
          ) : null
        }
      >
        <PageState
          resolution={pageState}
          loading={<DataTableSkeleton columns={4} className="flex-1" />}
          onRetry={handleRetry}
          className="flex-1"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <DataTable
              className="flex-1 min-h-0"
              data={data?.data ?? []}
              columns={columns}
              getRowKey={(r) => r.id}
              onRowClick={(r) => setSelectedId(r.id)}
              emptyState={
                <EmptyState
                  className="border-0 bg-transparent min-h-[40vh]"
                  illustration={<StateIllustration preset="alert" className="h-28 w-28" />}
                  title="No emergency events"
                  description="Declare emergency events to coordinate employee safety responses."
                  action={canManage ? { label: "Declare Event", onClick: handleOpenCreate } : undefined}
                />
              }
            />
            {data && (page > 1 || data.pagination.hasMore) ? (
              <CursorPageControls
                page={page}
                hasNext={data.pagination.hasMore}
                disabled={isFetching}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            ) : null}
          </div>
        </PageState>
      </PageWrapper>

      <EmergencyEventSheet open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}

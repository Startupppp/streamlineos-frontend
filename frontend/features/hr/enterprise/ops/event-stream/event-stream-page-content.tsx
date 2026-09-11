"use client";

import { useCallback, useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Database } from "lucide-react";
import { DownloadIcon } from "@animateicons/react/lucide";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useHrEvents,
  useHrEventDataDictionary,
  useHrMetricDefinitions,
  useExportHrEvents,
  type HrEvent,
  type EventCatalogEntry,
} from "@/hooks/api/hr/enterprise-ops-event-stream";
import { format } from "date-fns";
import { useOrgMembers } from "@/hooks/api/organization";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";

export function EventStreamPageContent() {
  const canExport = useCan("hr:analytics:read");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const [activeTab, setActiveTab] = useState("events");

  const { data, isLoading, isFetching, isError, error, refetch } = useHrEvents({ cursor });
  const { data: dictionary, isError: dictionaryIsError, error: dictionaryError, refetch: refetchDictionary } = useHrEventDataDictionary();
  const { data: metrics, isLoading: metricsLoading, isError: metricsIsError, error: metricsError, refetch: refetchMetrics } = useHrMetricDefinitions();
  const exportMutation = useExportHrEvents();
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : userId;
    },
    [memberById],
  );

  const eventColumns: DataTableColumn<HrEvent>[] = useMemo(() => [
    {
      key: "eventType",
      header: "Event",
      cell: (r) => (
        <Badge variant="outline" className="text-xs font-mono bg-primary/10 text-foreground border-primary/30">
          {r.eventType}
        </Badge>
      ),
    },
    {
      key: "entityType",
      header: "Entity",
      cell: (r) => (
        <span className="text-sm text-muted-foreground capitalize">{r.entityType.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "entityId",
      header: "Entity ID",
      cell: (r) => (
        <span className="font-mono text-xs text-muted-foreground">{r.entityId.slice(0, 8)}…</span>
      ),
    },
    {
      key: "actorUserId",
      header: "Actor",
      cell: (r) => r.actorUserId ? (
        <span className="text-sm text-foreground">{resolveMemberName(r.actorUserId)}</span>
      ) : (
        <span className="text-xs text-muted-foreground italic">system</span>
      ),
    },
    {
      key: "occurredAt",
      header: "Occurred",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(r.occurredAt), "MMM d, yyyy HH:mm:ss")}
        </span>
      ),
    },
  ], [resolveMemberName]);

  const catalogColumns: DataTableColumn<EventCatalogEntry>[] = [
    {
      key: "eventType",
      header: "Event Type",
      cell: (e) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{e.eventType}</code>,
    },
    {
      key: "description",
      header: "Description",
      cell: (e) => <span className="text-sm text-foreground">{e.description}</span>,
    },
    {
      key: "entityTypes",
      header: "Entity Types",
      cell: (e) => (
        <span className="text-xs text-muted-foreground">{e.entityTypes.join(", ")}</span>
      ),
    },
  ];

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  const handleRetryEvents = useCallback(() => { void refetch(); }, [refetch]);
  const handleRetryDictionary = useCallback(() => { void refetchDictionary(); }, [refetchDictionary]);
  const handleRetryMetrics = useCallback(() => { void refetchMetrics(); }, [refetchMetrics]);

  return (
    <PageWrapper
      title="HR Event Stream"
      subtitle="Immutable append-only log of all HR domain events"
      badge={
        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground flex items-center gap-1">
          <Database className="h-3 w-3" />
          Append-only
        </Badge>
      }
      actions={
        canExport ? (
          <LoadingButton
            onClick={() => exportMutation.mutate({ limit: 100 })}
            isPending={exportMutation.isPending}
            loadingText="Exporting…"
            variant="outline"
            size="sm"
          >
            <DownloadIcon size={16} className="mr-1.5" />
            Export
          </LoadingButton>
        ) : null
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-4 shrink-0">
          <TabsTrigger value="events">Event Log</TabsTrigger>
          <TabsTrigger value="dictionary">Data Dictionary</TabsTrigger>
          <TabsTrigger value="metrics">Metric Definitions</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-0 flex flex-1 min-h-0 flex-col">
          <div className="mb-3 shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
            This log is <strong>append-only</strong>. Events cannot be edited or deleted.
          </div>
          {isError ? (
            <ErrorState
              className="flex-1"
              title="Couldn't load the event stream"
              description={getErrorMessage(error)}
              onRetry={handleRetryEvents}
            />
          ) : (
            <div className="flex flex-1 min-h-0 flex-col gap-3">
              <DataTable
                className="flex-1 min-h-0"
                data={data?.data ?? []}
                columns={eventColumns}
                getRowKey={(r) => r.id}
                isLoading={isLoading}
                emptyState={
                  <EmptyState
                    illustrationPreset="documents"
                    title="No events in the stream"
                    description="HR events will appear here as an append-only audit log."
                    compact
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
          )}
        </TabsContent>

        <TabsContent value="dictionary" className="mt-0 flex flex-1 min-h-0 flex-col">
          {dictionaryIsError ? (
            <ErrorState
              className="flex-1"
              title="Couldn't load the data dictionary"
              description={getErrorMessage(dictionaryError)}
              onRetry={handleRetryDictionary}
            />
          ) : (
            <>
              <DataTable
                className="flex-1 min-h-0"
                data={dictionary?.catalog ?? []}
                columns={catalogColumns}
                getRowKey={(e) => e.eventType}
                emptyState={
                  <EmptyState
                    illustrationPreset="documents"
                    title="No catalog entries"
                    description="Event types from the data dictionary will show up here."
                    compact
                  />
                }
              />
              {dictionary?.immutable && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Event stream is append-only and immutable.
                </p>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="mt-0 flex flex-1 min-h-0 flex-col">
          {metricsIsError ? (
            <ErrorState
              className="flex-1"
              title="Couldn't load metric definitions"
              description={getErrorMessage(metricsError)}
              onRetry={handleRetryMetrics}
            />
          ) : metricsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : metrics && metrics.metrics.length > 0 ? (
            <div className="space-y-2">
              {metrics.metrics.map((m) => (
                <div key={m.name} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-medium text-foreground">{m.name}</code>
                    <Badge variant="secondary" className="text-xs">{m.aggregation}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              illustrationPreset="chart"
              title="No metric definitions"
              description="Metric definitions published by the HR event stream will appear here."
            />
          )}
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

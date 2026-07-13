"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Download, Database } from "lucide-react";
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

export function EventStreamPageContent() {
  const canExport = useCan("hr:analytics:read");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("events");

  const { data, isLoading } = useHrEvents({ page });
  const { data: dictionary } = useHrEventDataDictionary();
  const { data: metrics } = useHrMetricDefinitions();
  const exportMutation = useExportHrEvents();

  const eventColumns: DataTableColumn<HrEvent>[] = [
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
        <span className="font-mono text-xs text-muted-foreground">{r.actorUserId.slice(0, 8)}…</span>
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
  ];

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
            onClick={() => exportMutation.mutate({ page: 1, limit: 100 })}
            isPending={exportMutation.isPending}
            loadingText="Exporting…"
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </LoadingButton>
        ) : null
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="events">Event Log</TabsTrigger>
          <TabsTrigger value="dictionary">Data Dictionary</TabsTrigger>
          <TabsTrigger value="metrics">Metric Definitions</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <div className="mb-3 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            This log is <strong>append-only</strong>. Events cannot be edited or deleted.
          </div>
          <DataTable
            data={data?.data ?? []}
            columns={eventColumns}
            getRowKey={(r) => r.id}
            isLoading={isLoading}
            emptyState={<p className="text-sm text-muted-foreground text-center py-8">No events in the stream</p>}
            pagination={
              data
                ? {
                    mode: "server",
                    page,
                    pageSize: data.pagination.limit,
                    total: data.pagination.total,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="dictionary">
          <DataTable
            data={dictionary?.catalog ?? []}
            columns={catalogColumns}
            getRowKey={(e) => e.eventType}
            emptyState={<p className="text-sm text-muted-foreground text-center py-8">No catalog entries</p>}
          />
          {dictionary?.immutable && (
            <p className="mt-3 text-xs text-muted-foreground">
              Event stream is append-only and immutable.
            </p>
          )}
        </TabsContent>

        <TabsContent value="metrics">
          <div className="space-y-2">
            {metrics?.metrics.map((m) => (
              <div key={m.name} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-medium text-foreground">{m.name}</code>
                  <Badge variant="secondary" className="text-xs">{m.aggregation}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

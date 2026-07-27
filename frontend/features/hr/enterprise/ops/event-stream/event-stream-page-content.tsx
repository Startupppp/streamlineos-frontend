"use client";

import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Database } from "lucide-react";
import { DownloadIcon } from "@animateicons/react/lucide";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/build/shared/resolve-user-name";

export function EventStreamPageContent() {
  const canExport = useCan("hr:analytics:read");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("events");

  const { data, isLoading } = useHrEvents({ page });
  const { data: dictionary } = useHrEventDataDictionary();
  const { data: metrics } = useHrMetricDefinitions();
  const exportMutation = useExportHrEvents();
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = (userId: string) => {
    const member = memberById.get(userId);
    return member ? getUserDisplayName(member) : userId;
  };

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
  ], [memberById]);

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
            <DownloadIcon size={16} className="mr-1.5" />
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
          <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
            This log is <strong>append-only</strong>. Events cannot be edited or deleted.
          </div>
          <DataTable
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

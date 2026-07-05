"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useAuditEvents } from "@/hooks/api/timesheets/audit";
import { useCan } from "@/hooks/api/access";
import type { AuditEvent } from "@/features/timesheets/types";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { AuditDetailSheet } from "./audit-detail-sheet";

const SELECT_ALL = "__all__";
const PAGE_LIMIT = 20;

const ENTITY_TYPE_OPTIONS = [
  "timesheet_entry",
  "timesheet_period",
  "timesheet_settings",
  "timesheet_rate",
  "timesheet_approval",
];

const ACTION_OPTIONS = [
  "create",
  "update",
  "delete",
  "approve",
  "reject",
  "submit",
  "lock",
  "unlock",
];

const COLUMNS: DataTableColumn<AuditEvent>[] = [
  {
    key: "createdAt",
    header: "Time",
    cell: (row) => (
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {format(parseISO(row.createdAt), "MMM d, HH:mm")}
      </span>
    ),
  },
  {
    key: "actor",
    header: "Actor",
    cell: (row) => (
      <span className="text-xs">
        {row.actorName ?? row.actorUserId ?? "System"}
      </span>
    ),
  },
  {
    key: "action",
    header: "Action",
    cell: (row) => (
      <span className="text-xs font-mono text-muted-foreground">{row.action}</span>
    ),
  },
  {
    key: "entity",
    header: "Entity",
    cell: (row) => (
      <span className="text-xs font-mono">
        {row.entityType} <span className="text-muted-foreground">#{row.entityId}</span>
      </span>
    ),
  },
  {
    key: "reason",
    header: "Reason",
    cell: (row) => (
      <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
        {row.reason ?? "—"}
      </span>
    ),
  },
];

export function AuditTab() {
  const canView = useCan("timesheets:audit:view");
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState(SELECT_ALL);
  const [action, setAction] = useState(SELECT_ALL);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const query = useMemo(
    () => ({
      entityType: entityType !== SELECT_ALL ? entityType : undefined,
      action: action !== SELECT_ALL ? action : undefined,
      page,
      limit: PAGE_LIMIT,
    }),
    [entityType, action, page],
  );

  const { data, isLoading, isError, refetch } = useAuditEvents(query, canView);

  const events = data?.data ?? [];
  const total = data?.total ?? 0;

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handleRowClick = useCallback((row: AuditEvent) => setSelectedEvent(row), []);
  const handleDetailClose = useCallback(() => setSelectedEvent(null), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleEntityTypeChange = useCallback((val: string) => {
    setEntityType(val);
    setPage(1);
  }, []);

  const handleActionChange = useCallback((val: string) => {
    setAction(val);
    setPage(1);
  }, []);

  if (!canView) {
    return (
      <EmptyState
        title="Access restricted"
        description="You don't have permission to view the audit trail."
        compact
        className="min-h-[20vh]"
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load audit events"
        onRetry={handleRetry}
        className="flex-1 min-h-[30vh]"
      />
    );
  }

  const toolbar = (
    <div className="flex items-center gap-2">
      <Select value={entityType} onValueChange={handleEntityTypeChange}>
        <SelectTrigger className="h-7 text-xs w-44">
          <SelectValue placeholder="All entity types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SELECT_ALL} className="text-xs">
            All entity types
          </SelectItem>
          {ENTITY_TYPE_OPTIONS.map((et) => (
            <SelectItem key={et} value={et} className="text-xs font-mono">
              {et}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={action} onValueChange={handleActionChange}>
        <SelectTrigger className="h-7 text-xs w-36">
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SELECT_ALL} className="text-xs">
            All actions
          </SelectItem>
          {ACTION_OPTIONS.map((a) => (
            <SelectItem key={a} value={a} className="text-xs font-mono">
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <DataTable
        data={events}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_LIMIT,
          total,
          onPageChange: handlePageChange,
        }}
        rowClassName={() => "cursor-pointer"}
        emptyState={
          <EmptyState
            title="No audit events yet"
            description="Audit events will appear here as team members interact with timesheets."
            compact
          />
        }
      />

      <AuditDetailSheet
        event={selectedEvent}
        onOpenChange={handleDetailClose}
      />
    </>
  );
}

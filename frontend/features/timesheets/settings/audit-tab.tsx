"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useAuditEvents } from "@/hooks/api/timesheets-core/audit";
import { useCan } from "@/hooks/api/access";
import { auditActorLabel, type AuditEvent } from "@/features/timesheets/audit-types";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState } from "@/components/shared/error-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { AuditDetailSheet } from "./audit-detail-sheet";
import { AuditChainCheck } from "./audit-chain-check";

const SELECT_ALL = "__all__";
const PAGE_LIMIT = 20;

const ENTITY_TYPE_OPTIONS = [
  "entry",
  "period",
  "timer",
  "rate",
  "budget",
  "billing",
  "settings",
];

const ACTION_OPTIONS = [
  "entry.created",
  "entry.updated",
  "entry.voided",
  "period.submitted",
  "period.recalled",
  "period.approved",
  "period.rejected",
  "period.reopened",
  "period.locked",
  "period.unlocked",
  "timer.converted",
  "rate.created",
  "rate.updated",
  "rate.deleted",
  "budget.created",
  "budget.updated",
  "budget.deleted",
  "billing.exported",
  "billing.invoice_drafted",
  "settings.updated",
];

function humanizeToken(token: string): string {
  return token
    .split(/[._]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
        {auditActorLabel(row)}
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
      <TruncatedText text={row.reason ?? "—"} className="text-xs text-muted-foreground max-w-[180px]" />
    ),
  },
];

export function AuditTab() {
  const canView = useCan("timesheets:audit:view");
  const [entityType, setEntityType] = useState(SELECT_ALL);
  const [action, setAction] = useState(SELECT_ALL);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const query = useMemo(
    () => ({
      entityType: entityType !== SELECT_ALL ? entityType : undefined,
      action: action !== SELECT_ALL ? action : undefined,
      limit: PAGE_LIMIT,
    }),
    [entityType, action],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAuditEvents(query, canView);

  const events = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  const handleRowClick = useCallback((row: AuditEvent) => setSelectedEvent(row), []);
  const handleDetailClose = useCallback(() => setSelectedEvent(null), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleEntityTypeChange = useCallback((val: string) => {
    setEntityType(val);
  }, []);

  const handleActionChange = useCallback((val: string) => {
    setAction(val);
  }, []);

  if (!canView) {
    return (
      <EmptyState
        title="Access restricted"
        description="You don't have permission to view the audit trail."
        compact
        className="min-h-[20dvh]"
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load audit events"
        onRetry={handleRetry}
        className="flex-1 min-h-[30dvh]"
      />
    );
  }

  const toolbar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={entityType} onValueChange={handleEntityTypeChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")}>
          <SelectValue placeholder="All entity types" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value={SELECT_ALL} className="text-xs">
            All entity types
          </SelectItem>
          {ENTITY_TYPE_OPTIONS.map((et) => (
            <SelectItem key={et} value={et} className="text-xs">
              {humanizeToken(et)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={action} onValueChange={handleActionChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-36")}>
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value={SELECT_ALL} className="text-xs">
            All actions
          </SelectItem>
          {ACTION_OPTIONS.map((a) => (
            <SelectItem key={a} value={a} className="text-xs">
              {humanizeToken(a)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <AuditChainCheck />
      <DataTable
        data={events}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{ pageSize: PAGE_LIMIT }}
        rowClassName={() => "cursor-pointer"}
        emptyState={
          <EmptyState
            title="No audit events yet"
            description="Audit events will appear here as team members interact with timesheets."
            compact
          />
        }
      />
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        label="Load more audit entries"
      />

      <AuditDetailSheet
        event={selectedEvent}
        onOpenChange={handleDetailClose}
      />
    </>
  );
}

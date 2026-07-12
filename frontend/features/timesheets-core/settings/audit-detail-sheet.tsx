"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { AuditEvent } from "@/features/timesheets-core/types";

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string" || typeof value === "number") return String(value);
  const str = JSON.stringify(value);
  return str.length > 120 ? str.slice(0, 117) + "..." : str;
}

interface DiffRow {
  key: string;
  prev: unknown;
  next: unknown;
  changed: boolean;
}

interface DiffTableProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

function DiffTable({ before, after }: DiffTableProps) {
  const rows = useMemo<DiffRow[]>(() => {
    const keys = new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ]);
    return [...keys].map((key) => {
      const prev = before?.[key];
      const next = after?.[key];
      const changed = JSON.stringify(prev) !== JSON.stringify(next);
      return { key, prev, next, changed };
    });
  }, [before, after]);

  const columns = useMemo<DataTableColumn<DiffRow>[]>(() => {
    const cols: DataTableColumn<DiffRow>[] = [
      {
        key: "key",
        header: "Field",
        cell: (row) => (
          <span className="font-mono text-[10px] text-muted-foreground truncate block">
            {row.key}
          </span>
        ),
        className: "w-1/3 py-1.5 pr-3",
        headerClassName: "w-1/3",
      },
    ];
    if (before !== null) {
      cols.push({
        key: "prev",
        header: "Before",
        cell: (row) => (
          <span className="font-mono break-all">{renderValue(row.prev)}</span>
        ),
        className: "py-1.5 pr-3",
      });
    }
    if (after !== null) {
      cols.push({
        key: "next",
        header: "After",
        cell: (row) => (
          <span className="font-mono break-all">{renderValue(row.next)}</span>
        ),
        className: "py-1.5",
      });
    }
    return cols;
  }, [before, after]);

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No data recorded.</p>
    );
  }

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowKey={(row) => row.key}
      rowClassName={(row) => row.changed ? "bg-amber-50 dark:bg-amber-950/20" : ""}
      className="border-0 rounded-none text-xs"
    />
  );
}

interface AuditDetailSheetProps {
  event: AuditEvent | null;
  onOpenChange: (open: boolean) => void;
}

export function AuditDetailSheet({ event, onOpenChange }: AuditDetailSheetProps) {
  return (
    <Sheet open={event != null} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle className="text-sm font-semibold">Audit event</SheetTitle>
          {event && (
            <p className="text-xs text-muted-foreground">
              {event.entityType} #{event.entityId} · {event.action}
            </p>
          )}
        </SheetHeader>

        {event && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Time</p>
                <p>{format(parseISO(event.createdAt), "MMM d, yyyy HH:mm:ss")}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Actor</p>
                <p>{event.actorName ?? event.actorUserId ?? "System"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Action</p>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                  {event.action}
                </Badge>
              </div>
              {event.reason && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Reason</p>
                  <p>{event.reason}</p>
                </div>
              )}
            </div>

            {(event.before != null || event.after != null) && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Changes
                </p>
                <DiffTable before={event.before} after={event.after} />
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

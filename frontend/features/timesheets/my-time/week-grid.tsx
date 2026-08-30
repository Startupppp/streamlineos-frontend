"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { Copy, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProjectTicketSelect } from "./project-ticket-select";
import {
  useCreateTimesheetEntry,
  useUpdateTimesheetEntry,
  useVoidTimesheetEntry,
  useTimesheetEntries,
} from "@/hooks/api/timesheets-core";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { TimesheetEntry } from "@/features/timesheets";

interface GridRow {
  rowKey: string;
  projectId: number | null;
  ticketId: number | null;
  projectName: string;
  ticketLabel: string | null;
}

function deriveRows(entries: TimesheetEntry[]): GridRow[] {
  const map = new Map<string, GridRow>();
  for (const e of entries) {
    const key = `${e.projectId ?? 0}-${e.ticketId ?? 0}`;
    if (!map.has(key)) {
      map.set(key, {
        rowKey: key,
        projectId: e.projectId,
        ticketId: e.ticketId,
        projectName: e.project?.name ?? "No project",
        ticketLabel: e.ticket ? `#${e.ticket.ticketNumber}: ${e.ticket.title}` : null,
      });
    }
  }
  return [...map.values()];
}

function isCellLocked(entry: TimesheetEntry | undefined): boolean {
  return !!entry?.lockedAt || entry?.status === "APPROVED";
}

interface WeekGridProps {
  entries: TimesheetEntry[] | undefined;
  isLoading: boolean;
  days: string[];
  weekStart: string;
  weekEnd: string;
}

export function WeekGrid({ entries, isLoading, days, weekStart, weekEnd }: WeekGridProps) {
  const createEntry = useCreateTimesheetEntry();
  const updateEntry = useUpdateTimesheetEntry();
  const voidEntry = useVoidTimesheetEntry();

  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [pendingRows, setPendingRows] = useState<GridRow[]>([]);
  const [addingRow, setAddingRow] = useState(false);
  const [newRowProject, setNewRowProject] = useState<number | null>(null);
  const [newRowTicket, setNewRowTicket] = useState<number | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const prevWeekStart = useMemo(
    () => format(addDays(parseISO(weekStart), -7), "yyyy-MM-dd"),
    [weekStart],
  );
  const prevWeekEnd = useMemo(
    () => format(addDays(parseISO(weekEnd), -7), "yyyy-MM-dd"),
    [weekEnd],
  );
  const prevWeekQuery = useTimesheetEntries({ startDate: prevWeekStart, endDate: prevWeekEnd }, false);

  const entryList = useMemo(() => entries ?? [], [entries]);
  const entryMap = useMemo(() => {
    const m = new Map<string, TimesheetEntry>();
    for (const e of entryList) {
      m.set(`${e.projectId ?? 0}-${e.ticketId ?? 0}-${e.date}`, e);
    }
    return m;
  }, [entryList]);

  const serverRows = useMemo(() => deriveRows(entryList), [entryList]);
  const allRows = useMemo(() => {
    const serverKeys = new Set(serverRows.map((r) => r.rowKey));
    return [...serverRows, ...pendingRows.filter((r) => !serverKeys.has(r.rowKey))];
  }, [serverRows, pendingRows]);

  const dayTotals = useMemo(
    () =>
      days.map((d) =>
        entryList.reduce((sum, e) => (e.date === d ? sum + Number(e.hours) : sum), 0),
      ),
    [days, entryList],
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const commitCell = useCallback(
    (rowKey: string, date: string, value: string, row: GridRow) => {
      const hours = parseFloat(value) || 0;
      const existing = entryMap.get(`${rowKey}-${date}`);
      if (hours > 0 && !existing) {
        createEntry.mutate({
          date,
          hours,
          projectId: row.projectId ?? undefined,
          ticketId: row.ticketId ?? undefined,
          source: "MANUAL",
        });
      } else if (hours > 0 && existing && hours !== Number(existing.hours)) {
        updateEntry.mutate({ entryId: existing.id, data: { hours } });
      } else if (hours === 0 && existing && !isCellLocked(existing)) {
        voidEntry.mutate({ entryId: existing.id, reason: "Cleared via grid" });
      }
      setEditingCell(null);
    },
    [entryMap, createEntry, updateEntry, voidEntry],
  );

  const handleCellFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const key = e.currentTarget.dataset.cellKey ?? "";
    const existingHours = e.currentTarget.dataset.hours ?? "";
    setEditingCell(key);
    setEditingValue(existingHours);
  }, []);

  const handleCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  }, []);

  const handleCellBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const rowKey = e.currentTarget.dataset.rowKey ?? "";
      const date = e.currentTarget.dataset.date ?? "";
      const rowJson = e.currentTarget.dataset.row ?? "{}";
      let row: GridRow;
      try { row = JSON.parse(rowJson) as GridRow; } catch { return; }
      commitCell(rowKey, date, editingValue, row);
    },
    [editingValue, commitCell],
  );

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const rowKey = e.currentTarget.dataset.rowKey ?? "";
      const date = e.currentTarget.dataset.date ?? "";
      const rowJson = e.currentTarget.dataset.row ?? "{}";
      let row: GridRow;
      try { row = JSON.parse(rowJson) as GridRow; } catch { return; }
      commitCell(rowKey, date, editingValue, row);
      const dayIdx = days.indexOf(date);
      const rowIdx = allRows.findIndex((r) => r.rowKey === rowKey);
      const nextKey = `${allRows[rowIdx + 1]?.rowKey ?? ""}-${days[dayIdx]}`;
      cellRefs.current[nextKey]?.focus();
    },
    [editingValue, commitCell, days, allRows],
  );

  const handleAddRow = useCallback(() => setAddingRow(true), []);
  const handleCancelAddRow = useCallback(() => {
    setAddingRow(false);
    setNewRowProject(null);
    setNewRowTicket(null);
  }, []);

  const handleConfirmAddRow = useCallback(() => {
    const key = `${newRowProject ?? 0}-${newRowTicket ?? 0}`;
    const alreadyExists = allRows.some((r) => r.rowKey === key);
    if (!alreadyExists) {
      setPendingRows((prev) => [
        ...prev,
        { rowKey: key, projectId: newRowProject, ticketId: newRowTicket, projectName: "Project", ticketLabel: null },
      ]);
    }
    setAddingRow(false);
    setNewRowProject(null);
    setNewRowTicket(null);
  }, [newRowProject, newRowTicket, allRows]);

  const handleCopyLastWeek = useCallback(async () => {
    setIsCopying(true);
    try {
      const result = await prevWeekQuery.refetch();
      const prevEntries = result.data ?? [];
      for (const e of prevEntries) {
        const dayOff = differenceInCalendarDays(parseISO(e.date), parseISO(prevWeekStart));
        const newDate = format(addDays(parseISO(weekStart), dayOff), "yyyy-MM-dd");
        const alreadyExists = entryMap.has(`${e.projectId ?? 0}-${e.ticketId ?? 0}-${newDate}`);
        if (alreadyExists) continue;
        createEntry.mutate({
          date: newDate,
          hours: Number(e.hours),
          projectId: e.projectId ?? undefined,
          ticketId: e.ticketId ?? undefined,
          description: e.description ?? undefined,
          isBillable: e.isBillable,
          source: "MANUAL",
        });
      }
    } finally {
      setIsCopying(false);
    }
  }, [prevWeekQuery, prevWeekStart, weekStart, entryMap, createEntry]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <LoadingButton variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopyLastWeek} isPending={isCopying} loadingText="Copying…">
          <Copy className="h-3 w-3" />
          Copy last week
        </LoadingButton>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs" style={{ minWidth: 640 }}>
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-48">Project / Ticket</th>
              {days.map((d) => (
                <th key={d} className="text-center px-1 py-2 font-medium text-muted-foreground w-16">
                  <div>{format(parseISO(d), "EEE")}</div>
                  <div className="text-micro text-muted-foreground/70">{format(parseISO(d), "d")}</div>
                </th>
              ))}
              <th className="text-center px-2 py-2 font-medium text-muted-foreground w-14">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allRows.map((row) => {
              const rowTotal = days.reduce((sum, d) => {
                const e = entryMap.get(`${row.rowKey}-${d}`);
                return sum + (e ? Number(e.hours) : 0);
              }, 0);
              return (
                <tr key={row.rowKey} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-1.5">
                    <TruncatedText text={row.projectName} className="font-medium text-foreground" />
                    {row.ticketLabel && (
                      <TruncatedText text={row.ticketLabel} className="text-micro text-muted-foreground" />
                    )}
                  </td>
                  {days.map((d) => {
                    const cellKey = `${row.rowKey}-${d}`;
                    const existing = entryMap.get(cellKey);
                    const locked = isCellLocked(existing);
                    const isEditing = editingCell === cellKey;
                    const displayValue = isEditing ? editingValue : (existing ? existing.hours : "");
                    return (
                      <td key={d} className="px-1 py-1">
                        <div className="relative flex items-center justify-center">
                          <input
                            ref={(el) => { cellRefs.current[cellKey] = el; }}
                            type="number"
                            min="0"
                            step="0.25"
                            value={displayValue}
                            disabled={locked}
                            data-cell-key={cellKey}
                            data-row-key={row.rowKey}
                            data-date={d}
                            data-hours={existing?.hours ?? ""}
                            data-row={JSON.stringify(row)}
                            onFocus={handleCellFocus}
                            onChange={handleCellChange}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className={cn(
                              "w-14 h-7 rounded border text-center tabular-nums text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-colors",
                              locked
                                ? "bg-muted/50 border-border/30 text-muted-foreground cursor-not-allowed"
                                : "bg-background border-border hover:border-primary/50 focus:border-primary",
                              !displayValue && "border-dashed",
                            )}
                          />
                          {locked && <Lock className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-muted-foreground/50 pointer-events-none" />}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-center tabular-nums font-medium text-foreground">
                    {rowTotal > 0 ? rowTotal.toFixed(1) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/30">
              <td className="px-3 py-2 text-xs font-semibold text-muted-foreground">Total</td>
              {dayTotals.map((total, i) => (
                <td key={days[i]} className="px-1 py-2 text-center tabular-nums text-xs font-semibold text-foreground">
                  {total > 0 ? total.toFixed(1) : "—"}
                </td>
              ))}
              <td className="px-2 py-2 text-center tabular-nums text-xs font-bold text-foreground">
                {grandTotal.toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {addingRow ? (
        <div className="flex items-end gap-2 p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10">
          <div className="flex-1 min-w-0">
            <p className="text-dense text-muted-foreground mb-1.5">Select project &amp; ticket for new row</p>
            <ProjectTicketSelect
              projectId={newRowProject}
              ticketId={newRowTicket}
              onProjectChange={setNewRowProject}
              onTicketChange={setNewRowTicket}
            />
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCancelAddRow}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleConfirmAddRow} disabled={!newRowProject && !newRowTicket}>Add</Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleAddRow}>
          <Plus className="h-3.5 w-3.5" /> Add row
        </Button>
      )}
    </div>
  );
}

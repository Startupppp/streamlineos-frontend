"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { Copy, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProjectTicketSelect } from "./project-ticket-select";
import { describeCell, describeDayColumn } from "./day-label";
import {
  useCreateTimesheetEntry,
  useUpdateTimesheetEntry,
  useVoidTimesheetEntry,
  useTimesheetEntries,
  useTimesheetHolidays,
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
  /**
   * Marked, not blocked. A holiday is a day the organisation does not expect
   * work on, which is not the same as a day nobody may log — people do work
   * public holidays, and refusing the entry would lose that time rather than
   * record it. So the column is shaded and named, and the input stays live.
   */
  const { data: holidayData } = useTimesheetHolidays(weekStart, weekEnd);
  const holidayByDate = useMemo(
    () => new Map((holidayData?.holidays ?? []).map((h) => [h.date, h.name])),
    [holidayData],
  );

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

  /**
   * What the grid announces when a cell writes.
   *
   * Every edit here is a silent background mutation — the number just stays
   * where you typed it — so a screen reader user had no signal that anything
   * had been saved, or that it had failed. Errors already toast; this covers
   * the success and in-flight halves.
   */
  const saveStatus = useMemo(() => {
    const pending =
      createEntry.isPending || updateEntry.isPending || voidEntry.isPending;
    if (pending) return "Saving hours…";
    if (createEntry.isError || updateEntry.isError || voidEntry.isError)
      return "Could not save hours.";
    if (createEntry.isSuccess || updateEntry.isSuccess || voidEntry.isSuccess)
      return "Hours saved.";
    return "";
  }, [createEntry, updateEntry, voidEntry]);

  const commitCell = useCallback(
    (rowKey: string, date: string, value: string, row: GridRow) => {
      const hours = parseFloat(value) || 0;
      const existing = entryMap.get(`${rowKey}-${date}`);
      // A locked cell is read-only rather than disabled now, so it can be
      // focused and left; nothing it reports may reach a mutation.
      if (isCellLocked(existing)) {
        setEditingCell(null);
        return;
      }
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

  const focusCell = useCallback(
    (rowIdx: number, dayIdx: number) => {
      const row = allRows[rowIdx];
      const day = days[dayIdx];
      if (!row || !day) return false;
      const target = cellRefs.current[`${row.rowKey}-${day}`];
      if (!target) return false;
      target.focus();
      target.select();
      return true;
    },
    [allRows, days],
  );

  /**
   * Move around the grid with the arrow keys.
   *
   * Enter alone used to be the whole keyboard story, and a number input eats
   * Up and Down natively to step its own value — so a keyboard user pressing
   * Down on Monday silently changed Monday's hours instead of moving to the
   * next project. Arrow keys now navigate (and are prevented from stepping),
   * Home/End jump to the ends of the week, and Enter still commits and moves
   * down. Typing a value is unaffected: only the movement keys are captured.
   */
  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const NAV_KEYS = [
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ];
      if (!NAV_KEYS.includes(e.key)) return;

      const rowKey = e.currentTarget.dataset.rowKey ?? "";
      const date = e.currentTarget.dataset.date ?? "";
      const dayIdx = days.indexOf(date);
      const rowIdx = allRows.findIndex((r) => r.rowKey === rowKey);
      if (dayIdx < 0 || rowIdx < 0) return;

      // `selectionStart` is null on `input[type=number]`, which reads as "the
      // whole value", so Left/Right always navigate here. They still leave a
      // text-mode cell only from its edges if this ever stops being a number.
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const caretAtStart = start === null || start === 0;
      const caretAtEnd = end === null || end === e.currentTarget.value.length;
      if (e.key === "ArrowLeft" && !caretAtStart) return;
      if (e.key === "ArrowRight" && !caretAtEnd) return;

      e.preventDefault();

      if (e.key === "Enter") {
        const rowJson = e.currentTarget.dataset.row ?? "{}";
        let row: GridRow;
        try {
          row = JSON.parse(rowJson) as GridRow;
        } catch {
          return;
        }
        commitCell(rowKey, date, editingValue, row);
        focusCell(rowIdx + 1, dayIdx);
        return;
      }

      if (e.key === "ArrowUp") focusCell(rowIdx - 1, dayIdx);
      else if (e.key === "ArrowDown") focusCell(rowIdx + 1, dayIdx);
      else if (e.key === "ArrowLeft") focusCell(rowIdx, dayIdx - 1);
      else if (e.key === "ArrowRight") focusCell(rowIdx, dayIdx + 1);
      else if (e.key === "Home") focusCell(rowIdx, 0);
      else if (e.key === "End") focusCell(rowIdx, days.length - 1);
    },
    [editingValue, commitCell, days, allRows, focusCell],
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
      const prevEntries = result.data?.data ?? [];
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

      <p aria-live="polite" className="sr-only">
        {saveStatus}
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs" style={{ minWidth: 640 }}>
          <caption className="sr-only">
            Hours by project and day for the week of{" "}
            {format(parseISO(weekStart), "d MMMM yyyy")}. Use the arrow keys to move
            between cells, Enter to save and move down.
          </caption>
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th scope="col" className="text-left px-3 py-2 font-medium text-muted-foreground w-48">Project / Ticket</th>
              {days.map((d) => {
                const holiday = holidayByDate.get(d);
                return (
                  <th
                    key={d}
                    scope="col"
                    aria-label={describeDayColumn(d, holiday)}
                    className={cn(
                      "text-center px-1 py-2 font-medium text-muted-foreground w-16",
                      holiday && "bg-muted text-foreground",
                    )}
                  >
                    <div>{format(parseISO(d), "EEE")}</div>
                    <div className="text-micro text-muted-foreground/70">{format(parseISO(d), "d")}</div>
                    {holiday && (
                      <TruncatedText
                        text={holiday}
                        className="text-micro font-normal text-muted-foreground"
                      />
                    )}
                  </th>
                );
              })}
              <th scope="col" className="text-center px-2 py-2 font-medium text-muted-foreground w-14">Total</th>
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
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    <TruncatedText text={row.projectName} className="font-medium text-foreground" />
                    {row.ticketLabel && (
                      <TruncatedText text={row.ticketLabel} className="text-micro text-muted-foreground" />
                    )}
                  </th>
                  {days.map((d) => {
                    const cellKey = `${row.rowKey}-${d}`;
                    const existing = entryMap.get(cellKey);
                    const locked = isCellLocked(existing);
                    const isEditing = editingCell === cellKey;
                    const displayValue = isEditing ? editingValue : (existing ? existing.hours : "");
                    return (
                      <td
                        key={d}
                        className={cn("px-1 py-1", holidayByDate.has(d) && "bg-muted/40")}
                      >
                        <div className="relative flex items-center justify-center">
                          <input
                            ref={(el) => { cellRefs.current[cellKey] = el; }}
                            aria-label={`${row.projectName}${row.ticketLabel ? ` — ${row.ticketLabel}` : ""} hours on ${d}`}
                            type="number"
                            min="0"
                            step="0.25"
                            value={displayValue}
                            /**
                             * Read-only rather than disabled: a disabled input
                             * leaves the tab order and is skipped by screen
                             * readers, so a week whose first three days are
                             * approved simply had no Monday, Tuesday or
                             * Wednesday for a keyboard user. Read-only keeps
                             * the cell reachable and announces why it cannot
                             * be changed, which is what the padlock already
                             * says to everyone else.
                             */
                            readOnly={locked}
                            aria-readonly={locked || undefined}
                            aria-label={describeCell(
                              row.ticketLabel
                                ? `${row.projectName}, ${row.ticketLabel}`
                                : row.projectName,
                              d,
                              holidayByDate.get(d),
                              locked,
                            )}
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
                          {locked && <Lock aria-hidden="true" className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-muted-foreground/50 pointer-events-none" />}
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

"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { Copy, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProjectTicketSelect } from "./project-ticket-select";
import { describeCell } from "./day-label";
import {
  useCopyTimesheetEntries,
  useCreateTimesheetEntry,
  useUpdateTimesheetEntry,
  useVoidTimesheetEntry,
  useTimesheetEntries,
  useTimesheetHolidays,
} from "@/hooks/api/timesheets-core";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { CreateEntryInput, TimesheetEntry } from "@/features/timesheets";
import { deriveRows, isCellLocked, rowKeyOf, type GridRow } from "./week-grid-rows";
import { useWeekGridCells } from "./use-week-grid-cells";
import { OVERFLOW_EDGE_FADE_CLASS, useHorizontalOverflow } from "@/hooks/common/use-horizontal-overflow";

export interface CopyLastWeekResult {
  created: number;
  skipped: number;
  failed: number;
}

/** One line for the whole copy, so a 20-entry week is not 20 toasts. */
export function describeCopyResult({ created, skipped, failed }: CopyLastWeekResult): string {
  if (created === 0 && failed === 0)
    return skipped > 0
      ? "Nothing to copy — this week already has those entries."
      : "Last week had no entries to copy.";
  const parts = [`Copied ${created} ${created === 1 ? "entry" : "entries"}`];
  if (skipped > 0) parts.push(`${skipped} already logged`);
  if (failed > 0) parts.push(`${failed} failed`);
  return `${parts.join(" · ")}.`;
}

interface WeekGridProps {
  entries: TimesheetEntry[] | undefined;
  isLoading: boolean;
  days: string[];
  weekStart: string;
  weekEnd: string;
}

export function WeekGrid({
  entries,
  isLoading,
  days,
  weekStart,
  weekEnd,
}: WeekGridProps) {
  const { data: holidayData } = useTimesheetHolidays(weekStart, weekEnd);
  const holidayByDate = useMemo(
    () => new Map((holidayData?.holidays ?? []).map((h) => [h.date, h.name])),
    [holidayData],
  );

  const createEntry = useCreateTimesheetEntry();
  const updateEntry = useUpdateTimesheetEntry();
  const voidEntry = useVoidTimesheetEntry();
  const copyEntries = useCopyTimesheetEntries();

  const [pendingRows, setPendingRows] = useState<GridRow[]>([]);
  const [addingRow, setAddingRow] = useState(false);
  const [newRowProject, setNewRowProject] = useState<number | null>(null);
  const [newRowTicket, setNewRowTicket] = useState<number | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const gridOverflow = useHorizontalOverflow(gridScrollRef, entries);

  const prevWeekStart = useMemo(
    () => format(addDays(parseISO(weekStart), -7), "yyyy-MM-dd"),
    [weekStart],
  );
  const prevWeekEnd = useMemo(
    () => format(addDays(parseISO(weekEnd), -7), "yyyy-MM-dd"),
    [weekEnd],
  );
  const prevWeekQuery = useTimesheetEntries(
    { startDate: prevWeekStart, endDate: prevWeekEnd },
    false,
  );

  const entryList = useMemo(() => entries ?? [], [entries]);
  const entryMap = useMemo(() => {
    const m = new Map<string, TimesheetEntry>();
    for (const e of entryList) {
      m.set(`${rowKeyOf(e)}-${e.date}`, e);
    }
    return m;
  }, [entryList]);

  const serverRows = useMemo(() => deriveRows(entryList), [entryList]);
  const allRows = useMemo(() => {
    const serverKeys = new Set(serverRows.map((r) => r.rowKey));
    return [
      ...serverRows,
      ...pendingRows.filter((r) => !serverKeys.has(r.rowKey)),
    ];
  }, [serverRows, pendingRows]);

  const dayTotals = useMemo(
    () =>
      days.map((d) =>
        entryList.reduce(
          (sum, e) => (e.date === d ? sum + Number(e.hours) : sum),
          0,
        ),
      ),
    [days, entryList],
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  const {
    cellRefs,
    editingCell,
    editingValue,
    cellError,
    saveStatus,
    handleCellFocus,
    handleCellChange,
    handleCellBlur,
    handleCellKeyDown,
  } = useWeekGridCells({
    entryMap,
    allRows,
    days,
    createEntry,
    updateEntry,
    voidEntry,
  });

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
        {
          rowKey: key,
          projectId: newRowProject,
          ticketId: newRowTicket,
          projectName: "Project",
          ticketLabel: null,
        },
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
      let skipped = 0;
      const rows: CreateEntryInput[] = [];
      for (const e of prevEntries) {
        const dayOff = differenceInCalendarDays(
          parseISO(e.date),
          parseISO(prevWeekStart),
        );
        const newDate = format(
          addDays(parseISO(weekStart), dayOff),
          "yyyy-MM-dd",
        );
        const alreadyExists = entryMap.has(
          `${e.projectId ?? 0}-${e.ticketId ?? 0}-${newDate}`,
        );
        if (alreadyExists) {
          skipped += 1;
          continue;
        }
        rows.push({
          date: newDate,
          hours: Number(e.hours),
          projectId: e.projectId ?? undefined,
          ticketId: e.ticketId ?? undefined,
          description: e.description ?? undefined,
          isBillable: e.isBillable,
          source: "MANUAL",
        });
      }
      // Awaited, so "Copying…" outlives the writes it started, and reported
      // once rather than one toast and one refetch per row.
      const { created, failed } = await copyEntries.mutateAsync(rows);
      toast[failed > 0 ? "error" : "success"](
        describeCopyResult({ created, skipped, failed }),
      );
    } finally {
      setIsCopying(false);
    }
  }, [prevWeekQuery, prevWeekStart, weekStart, entryMap, copyEntries]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <LoadingButton
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={handleCopyLastWeek}
          isPending={isCopying}
          loadingText="Copying…"
        >
          <Copy className="h-3 w-3" />
          Copy last week
        </LoadingButton>
      </div>

      <p aria-live="polite" className="sr-only">
        {saveStatus}
      </p>

      {cellError ? (
        <p role="alert" className="text-xs text-destructive">
          {cellError}
        </p>
      ) : null}

      <div
        ref={gridScrollRef}
        data-hidden-left={gridOverflow.hiddenLeft}
        data-hidden-right={gridOverflow.hiddenRight}
        className={cn("overflow-x-auto rounded-lg border border-border scrollbar-thin", OVERFLOW_EDGE_FADE_CLASS)}
      >
        {/*
          `table-fixed` is load-bearing, not cosmetic. Under the default auto
          layout a cell's declared width is only a suggestion, so the sticky
          project column grew to the longest project name — 242px of a 356px
          scroll port at 390px wide — and, being sticky, it then sat on top of
          Thu/Fri/Sat at every scroll offset that would have revealed them.
          Fixed layout makes `w-28 sm:w-48` the real width and lets the
          `truncate` inside the cell do its job (QA-TS-001).
        */}
        <table className="w-full table-fixed text-xs" style={{ minWidth: 800 }}>
          <caption className="sr-only">
            Hours by project and day for the week of{" "}
            {format(parseISO(weekStart), "d MMMM yyyy")}. Use the arrow keys to
            move between cells, Enter to save and move down.
          </caption>
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {/* Opaque, not `bg-muted/40`: a translucent sticky cell lets the
                  day columns it is covering show through it (QA-TS-001). */}
              <th className="sticky left-0 z-10 bg-card text-left px-3 py-2 font-medium text-muted-foreground w-28 sm:w-48 border-r border-border">
                Project / Ticket
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  aria-label={format(parseISO(d), "EEEE d MMMM")}
                  className="text-center px-1 py-2 font-medium text-muted-foreground w-16"
                >
                  <div aria-hidden="true">{format(parseISO(d), "EEE")}</div>
                  <div aria-hidden="true" className="text-micro text-muted-foreground">
                    {format(parseISO(d), "d")}
                  </div>
                </th>
              ))}
              <th className="text-center px-2 py-2 font-medium text-muted-foreground w-14">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allRows.map((row) => {
              const rowTotal = days.reduce((sum, d) => {
                const e = entryMap.get(`${row.rowKey}-${d}`);
                return sum + (e ? Number(e.hours) : 0);
              }, 0);
              return (
                <tr
                  key={row.rowKey}
                  className="group hover:bg-muted/20 transition-colors"
                >
                  <th scope="row" className="sticky left-0 z-10 bg-card group-hover:bg-muted px-3 py-1.5 text-left font-normal border-r border-border">
                    <TruncatedText
                      text={row.projectName}
                      className="font-medium text-foreground"
                    />
                    {row.ticketLabel && (
                      <TruncatedText
                        text={row.ticketLabel}
                        className="text-micro text-muted-foreground"
                      />
                    )}
                  </th>
                  {days.map((d) => {
                    const cellKey = `${row.rowKey}-${d}`;
                    const existing = entryMap.get(cellKey);
                    const locked = isCellLocked(existing);
                    const isEditing = editingCell === cellKey;
                    const displayValue = isEditing
                      ? editingValue
                      : existing
                        ? existing.hours
                        : "";
                    return (
                      <td
                        key={d}
                        className={cn(
                          "px-1 py-1",
                          holidayByDate.has(d) && "bg-muted/40",
                        )}
                      >
                        <div className="relative flex items-center justify-center">
                          <input
                            ref={(el) => {
                              cellRefs.current[cellKey] = el;
                            }}
                            type="number"
                            min="0"
                            step="0.25"
                            value={displayValue}
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
                          {locked && (
                            <Lock className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
                          )}
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
              <td className="sticky left-0 z-10 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border">
                Total
              </td>
              {dayTotals.map((total, i) => (
                <td
                  key={days[i]}
                  className="px-1 py-2 text-center tabular-nums text-xs font-semibold text-foreground"
                >
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
      {gridOverflow.scrolls ? (
        <p className="text-micro text-muted-foreground">
          Scroll sideways to reach every day of the week and the weekly total.
        </p>
      ) : null}

      {addingRow ? (
        <div className="flex items-end gap-2 p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10">
          <div className="flex-1 min-w-0">
            <p className="text-dense text-muted-foreground mb-1.5">
              Select project &amp; ticket for new row
            </p>
            <ProjectTicketSelect
              projectId={newRowProject}
              ticketId={newRowTicket}
              onProjectChange={setNewRowProject}
              onTicketChange={setNewRowTicket}
            />
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCancelAddRow}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleConfirmAddRow}
              disabled={!newRowProject && !newRowTicket}
            >
              Add
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleAddRow}
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </Button>
      )}
    </div>
  );
}

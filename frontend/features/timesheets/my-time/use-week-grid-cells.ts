"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  useCreateTimesheetEntry,
  useUpdateTimesheetEntry,
  useVoidTimesheetEntry,
} from "@/hooks/api/timesheets-core";
import type { TimesheetEntry } from "@/features/timesheets";
import { isCellLocked, type GridRow } from "./week-grid-rows";

const NAV_KEYS = [
  "Enter",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
];

interface WeekGridCellsInput {
  entryMap: Map<string, TimesheetEntry>;
  allRows: GridRow[];
  days: string[];
  createEntry: ReturnType<typeof useCreateTimesheetEntry>;
  updateEntry: ReturnType<typeof useUpdateTimesheetEntry>;
  voidEntry: ReturnType<typeof useVoidTimesheetEntry>;
}

function rowFromDataset(dataset: DOMStringMap): GridRow | null {
  try {
    return JSON.parse(dataset.row ?? "{}") as GridRow;
  } catch {
    return null;
  }
}

export function useWeekGridCells({
  entryMap,
  allRows,
  days,
  createEntry,
  updateEntry,
  voidEntry,
}: WeekGridCellsInput) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
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
    setEditingCell(e.currentTarget.dataset.cellKey ?? "");
    setEditingValue(e.currentTarget.dataset.hours ?? "");
  }, []);

  const handleCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  }, []);

  const handleCellBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const row = rowFromDataset(e.currentTarget.dataset);
      if (!row) return;
      commitCell(
        e.currentTarget.dataset.rowKey ?? "",
        e.currentTarget.dataset.date ?? "",
        editingValue,
        row,
      );
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
        const row = rowFromDataset(e.currentTarget.dataset);
        if (!row) return;
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

  return {
    cellRefs,
    editingCell,
    editingValue,
    saveStatus,
    handleCellFocus,
    handleCellChange,
    handleCellBlur,
    handleCellKeyDown,
  };
}

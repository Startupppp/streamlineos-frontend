"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  useCreateTimesheetEntry,
  useUpdateTimesheetEntry,
  useVoidTimesheetEntry,
} from "@/hooks/api/timesheets-core";
import type { TimesheetEntry } from "@/features/timesheets";
import { isCellLocked, type GridRow } from "./week-grid-rows";

export const GRID_MAX_HOURS_PER_DAY = 24;
const INVALID_HOURS_MESSAGE = `Hours must be between 0 and ${GRID_MAX_HOURS_PER_DAY}.`;

function parseHoursInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0 || parsed > GRID_MAX_HOURS_PER_DAY) return null;
  return parsed;
}

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

  const [cellError, setCellError] = useState<string | null>(null);
  const lastCommitted = useRef<{ cellKey: string; value: string } | null>(null);

  const saveStatus = useMemo(() => {
    if (cellError) return cellError;
    const pending =
      createEntry.isPending || updateEntry.isPending || voidEntry.isPending;
    if (pending) return "Saving hours…";
    if (createEntry.isError || updateEntry.isError || voidEntry.isError)
      return "Could not save hours.";
    if (createEntry.isSuccess || updateEntry.isSuccess || voidEntry.isSuccess)
      return "Hours saved.";
    return "";
  }, [cellError, createEntry, updateEntry, voidEntry]);

  const commitCell = useCallback(
    (rowKey: string, date: string, value: string, row: GridRow): boolean => {
      const existing = entryMap.get(`${rowKey}-${date}`);
      if (isCellLocked(existing)) {
        setEditingCell(null);
        setCellError(null);
        return true;
      }

      const hours = parseHoursInput(value);
      if (hours === null) {
        setCellError(INVALID_HOURS_MESSAGE);
        return false;
      }
      setCellError(null);

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
      return true;
    },
    [entryMap, createEntry, updateEntry, voidEntry],
  );

  const handleCellFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setEditingCell(e.currentTarget.dataset.cellKey ?? "");
    setEditingValue(e.currentTarget.dataset.hours ?? "");
    setCellError(null);
    lastCommitted.current = null;
  }, []);

  const handleCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  }, []);

  const handleCellBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const cellKey = e.currentTarget.dataset.cellKey ?? "";
      const committed = lastCommitted.current;
      if (committed?.cellKey === cellKey && committed.value === editingValue) return;
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

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!NAV_KEYS.includes(e.key)) return;

      const rowKey = e.currentTarget.dataset.rowKey ?? "";
      const date = e.currentTarget.dataset.date ?? "";
      const dayIdx = days.indexOf(date);
      const rowIdx = allRows.findIndex((r) => r.rowKey === rowKey);
      if (dayIdx < 0 || rowIdx < 0) return;

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
        if (!commitCell(rowKey, date, editingValue, row)) return;
        lastCommitted.current = {
          cellKey: e.currentTarget.dataset.cellKey ?? "",
          value: editingValue,
        };
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
    cellError,
    saveStatus,
    handleCellFocus,
    handleCellChange,
    handleCellBlur,
    handleCellKeyDown,
  };
}

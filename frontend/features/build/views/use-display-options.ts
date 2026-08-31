"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-panel";
import type {
  ColumnByOption,
  CompletedIssuesFilter,
  DisplayOptions,
  GroupByOption,
  OrderByOption,
  SwimlaneBy,
} from "../shared/types";

const STORAGE_PREFIX = "streamlineos:projects:display-options:v1:";

const COLUMN_BY_VALUES: readonly ColumnByOption[] = ["status", "assignee", "priority", "label", "cycle", "project"];
const GROUP_BY_VALUES: readonly GroupByOption[] = ["status", "assignee", "priority", "label", "cycle", "project", "none"];
const ROW_BY_VALUES: readonly SwimlaneBy[] = ["none", "status", "assignee", "priority", "cycle"];
const ORDER_BY_VALUES: readonly OrderByOption[] = ["created", "priority", "dueDate", "manual"];
const COMPLETED_VALUES: readonly CompletedIssuesFilter[] = ["all", "none", "last-day", "last-week", "last-month"];

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value !== "string") return fallback;
  return allowed.find((option) => option === value) ?? fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hydrateDisplayOptions(raw: unknown): DisplayOptions {
  const base = DEFAULT_DISPLAY_OPTIONS;
  if (!isRecord(raw)) return { ...base };
  return {
    columnBy: pickEnum(raw.columnBy, COLUMN_BY_VALUES, base.columnBy),
    rowBy: pickEnum(raw.rowBy, ROW_BY_VALUES, base.rowBy),
    groupBy: pickEnum(raw.groupBy, GROUP_BY_VALUES, base.groupBy),
    orderBy: pickEnum(raw.orderBy, ORDER_BY_VALUES, base.orderBy),
    orderCompleteByRecency: pickBool(raw.orderCompleteByRecency, base.orderCompleteByRecency),
    completedIssues: pickEnum(raw.completedIssues, COMPLETED_VALUES, base.completedIssues),
    showSubIssues: pickBool(raw.showSubIssues, base.showSubIssues),
    showEmptyGroups: pickBool(raw.showEmptyGroups, base.showEmptyGroups),
    showEmptyColumns: pickBool(raw.showEmptyColumns, base.showEmptyColumns),
    showEmptyRows: pickBool(raw.showEmptyRows, base.showEmptyRows),
    showId: pickBool(raw.showId, base.showId),
    showStatus: pickBool(raw.showStatus, base.showStatus),
    showAssignee: pickBool(raw.showAssignee, base.showAssignee),
    showPriority: pickBool(raw.showPriority, base.showPriority),
    showEstimate: pickBool(raw.showEstimate, base.showEstimate),
    showCycle: pickBool(raw.showCycle, base.showCycle),
    showLabels: pickBool(raw.showLabels, base.showLabels),
    showDueDate: pickBool(raw.showDueDate, base.showDueDate),
    showProject: pickBool(raw.showProject, base.showProject),
    showMilestone: pickBool(raw.showMilestone, base.showMilestone),
    showLinks: pickBool(raw.showLinks, base.showLinks),
    showTimeInStatus: pickBool(raw.showTimeInStatus, base.showTimeInStatus),
    showCreated: pickBool(raw.showCreated, base.showCreated),
    showUpdated: pickBool(raw.showUpdated, base.showUpdated),
    showPRs: pickBool(raw.showPRs, base.showPRs),
  };
}

function loadStored(projectId: number, scope: string): DisplayOptions | null {
  try {
    const raw = localStorage.getItem(
      orgScopedStorageKey(`${STORAGE_PREFIX}${projectId}`, scope),
    );
    if (!raw) return null;
    return hydrateDisplayOptions(JSON.parse(raw));
  } catch {
    return null;
  }
}

function persist(projectId: number, options: DisplayOptions, scope: string): void {
  try {
    localStorage.setItem(
      orgScopedStorageKey(`${STORAGE_PREFIX}${projectId}`, scope),
      JSON.stringify(options),
    );
  } catch {}
}

export function useDisplayOptions(
  projectId: number,
): [DisplayOptions, (next: DisplayOptions) => void] {
  const scope = useOrgStorageScope();
  const [options, setOptions] = useState<DisplayOptions>(DEFAULT_DISPLAY_OPTIONS);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const stored = loadStored(projectId, scope);
    if (stored) setOptions(stored);
  }, [projectId, scope]);

  const update = useCallback(
    (next: DisplayOptions) => {
      setOptions(next);
      persist(projectId, next, scope);
    },
    [projectId, scope],
  );

  return [options, update];
}

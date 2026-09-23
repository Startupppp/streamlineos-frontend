"use client";
import { format, parseISO } from "date-fns";
import type { TimesheetEntry } from "@/features/timesheets";
import {
  requiredFieldLabel,
  type RequiredField,
} from "@/features/timesheets/settings/required-fields";

export interface IncompleteEntry {
  entry: TimesheetEntry;
  missing: RequiredField[];
}

export interface IncompleteEntriesNoticeProps {
  rows: IncompleteEntry[];
}

export function IncompleteEntriesNotice({ rows }: IncompleteEntriesNoticeProps) {
  if (rows.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3"
    >
      <p className="text-sm font-medium text-status-warning-ink">
        {rows.length === 1
          ? "One entry is missing something your organisation requires"
          : `${rows.length} entries are missing something your organisation requires`}
      </p>
      <p className="text-xs text-status-warning-ink mt-0.5">
        Fill these in and the week can be submitted.
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map(({ entry, missing }) => (
          <li key={entry.id} className="text-xs text-status-warning-ink">
            <span className="font-medium">
              {format(parseISO(entry.date), "EEE d MMM")}
            </span>
            <span className="tabular-nums"> · {Number(entry.hours).toFixed(1)}h</span>
            <span> — needs {missing.map(requiredFieldLabel).join(" and ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

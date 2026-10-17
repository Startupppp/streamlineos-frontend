import { format, isValid } from "date-fns";

import { getUserDisplayName } from "@/lib/person-display";

import type { LeaveRequest } from "./components/leaves-types";

/**
 * HRMS-E2E-022. The leave export used to be a closure over `myLeaveRequests`
 * with the button rendered only on the "My leaves" tab. An admin standing on
 * Approvals with four pending team requests had no export control at all, and
 * the one they could reach exported a different collection from the one on
 * screen — the two halves of "clicked export, got nothing".
 *
 * The export is described here as a *view*: the rows the person is looking at
 * plus how to name them. The caller picks the view from the active tab, so the
 * file always matches the screen, and there is exactly one workbook builder to
 * keep the two column sets honest.
 *
 * Nothing in here returns quietly. An empty row set is a real result and gets a
 * header-only workbook; anything that goes wrong throws, and the caller turns
 * that into a toast.
 */

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface LeaveExportView {
  /** Exactly the rows the current tab renders. */
  rows: LeaveRequest[];
  /**
   * Team exports name the person each row belongs to. A personal export does
   * not — every row would repeat the reader's own name.
   */
  includeEmployee: boolean;
  /** Filename stem; the date is appended by the caller. */
  filePrefix: string;
  /** Singular noun used in the toast: "leave request", "team leave request". */
  noun: string;
  /** Worksheet tab name. */
  sheetName: string;
}

/**
 * Builds the export view for a tab.
 *
 * `approvals` only exists for an admin, and `incoming` is every loaded team row
 * — the same list the Approvals tab's "All" panel renders, not just the pending
 * subset, because an export of a filtered-down view that says nothing about the
 * filter is how people ship half a report.
 */
export function leaveExportViewFor(
  activeTab: string,
  mine: LeaveRequest[],
  incoming: LeaveRequest[],
): LeaveExportView {
  if (activeTab === "approvals")
    return {
      rows: incoming,
      includeEmployee: true,
      filePrefix: "team-leave-requests",
      noun: "team leave request",
      sheetName: "Team Leave Requests",
    };

  return {
    rows: mine,
    includeEmployee: false,
    filePrefix: "leave-requests",
    noun: "leave request",
    sheetName: "Leave Requests",
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Renders a date cell as `yyyy-MM-dd` without ever throwing.
 *
 * A plain `yyyy-MM-dd` string is passed through verbatim: parsing it to a Date
 * reads it as UTC midnight, which the host's timezone can shift back a day.
 * Anything unparseable becomes a dash rather than a `RangeError` that would
 * take the whole export down.
 */
export function exportDateText(
  value: string | Date | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return isValid(value) ? format(value, "yyyy-MM-dd") : "-";
  if (ISO_DATE.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : "-";
}

interface ExportColumn {
  header: string;
  width: number;
}

const EMPLOYEE_COLUMN: ExportColumn = { header: "Employee", width: 22 };

const LEAVE_COLUMNS: ExportColumn[] = [
  { header: "Type", width: 15 },
  { header: "From", width: 14 },
  { header: "To", width: 14 },
  { header: "Priority", width: 10 },
  { header: "Status", width: 12 },
  { header: "Reason", width: 30 },
  { header: "Requested On", width: 14 },
];

function rowValues(request: LeaveRequest, includeEmployee: boolean): string[] {
  const values = [
    request.leaveType?.name || "-",
    exportDateText(request.startDate),
    exportDateText(request.endDate),
    request.priority || "Medium",
    request.status || "-",
    request.reason || "-",
    exportDateText(request.createdAt),
  ];
  return includeEmployee
    ? [getUserDisplayName(request.user), ...values]
    : values;
}

/** Builds the workbook for a view and returns it as a Blob, or throws. */
export async function buildLeaveExportBlob(
  view: LeaveExportView,
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(view.sheetName);

  sheet.columns = view.includeEmployee
    ? [EMPLOYEE_COLUMN, ...LEAVE_COLUMNS]
    : LEAVE_COLUMNS;
  sheet.getRow(1).font = { bold: true };

  for (const request of view.rows)
    sheet.addRow(rowValues(request, view.includeEmployee));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME });
  if (blob.size === 0)
    throw new Error(
      "The leave export came back empty. Nothing was saved — please try again.",
    );
  return blob;
}

/** Past-tense, specific, and truthful about an empty sheet (FE-81). */
export function leaveExportToastMessage(view: LeaveExportView): string {
  if (view.rows.length === 0)
    return `Exported an empty ${view.noun} sheet — nothing matched this view`;
  return `Exported ${view.rows.length} ${view.noun}${view.rows.length === 1 ? "" : "s"}`;
}

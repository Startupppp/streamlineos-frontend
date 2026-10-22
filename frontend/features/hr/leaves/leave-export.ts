import { format, isValid } from "date-fns";

import { getUserDisplayName } from "@/lib/person-display";

import type { LeaveRequest } from "./components/leaves-types";


export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface LeaveExportView {
  rows: LeaveRequest[];
  includeEmployee: boolean;
  filePrefix: string;
  noun: string;
  sheetName: string;
}

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

export function leaveExportToastMessage(view: LeaveExportView): string {
  if (view.rows.length === 0)
    return `Exported an empty ${view.noun} sheet — nothing matched this view`;
  return `Exported ${view.rows.length} ${view.noun}${view.rows.length === 1 ? "" : "s"}`;
}

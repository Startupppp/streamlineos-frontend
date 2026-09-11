"use client";

import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { type DataTableColumn } from "@/components/ui/data-table";
import { SourceRefsPopover } from "./source-refs-popover";
import {
  type PayrollInputSnapshot,
  type PayrollAdjustmentListItem,
} from "@/hooks/api/payroll/payroll-inputs";
import { getUserDisplayName } from "@/lib/person-display";
import { formatCurrencyFull } from "@/lib/format-utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function payloadNumber(payload: unknown, key: string): number {
  if (!isRecord(payload)) return 0;
  const value = payload[key];
  return typeof value === "number" ? value : 0;
}

function payloadCount(payload: unknown, key: string): number {
  if (!isRecord(payload)) return 0;
  const value = payload[key];
  return Array.isArray(value) ? value.length : 0;
}

export function resolveDisplayName(row: PayrollInputSnapshot | PayrollAdjustmentListItem): string {
  return getUserDisplayName({
    name: row.userName,
    firstName: row.userFirstName,
    lastName: row.userLastName,
    email: row.userEmail,
  });
}

export const attendanceColumns: DataTableColumn<PayrollInputSnapshot>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
  },
  {
    key: "payableDays",
    header: "Payable",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "payableDays"),
  },
  {
    key: "presentDays",
    header: "Present",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "presentDays"),
  },
  {
    key: "absentDays",
    header: "Absent",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "absentDays"),
  },
  {
    key: "lateCount",
    header: "Late",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "lateCount"),
  },
  {
    key: "overtimeMinutes",
    header: "OT (min)",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "overtimeMinutes"),
  },
  {
    key: "refs",
    header: "",
    className: "w-6",
    cell: (row) => <SourceRefsPopover refs={row.sourceRefs} />,
  },
];

export const leaveColumns: DataTableColumn<PayrollInputSnapshot>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
  },
  {
    key: "paidLeaveDays",
    header: "Paid Leave",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "paidLeaveDays"),
  },
  {
    key: "unpaidLeaveDays",
    header: "Unpaid",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "unpaidLeaveDays"),
  },
  {
    key: "halfDayCount",
    header: "Half Days",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "halfDayCount"),
  },
  {
    key: "encashmentDays",
    header: "Encashment",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadNumber(row.payload, "encashmentDays"),
  },
  {
    key: "refs",
    header: "",
    className: "w-6",
    cell: (row) => <SourceRefsPopover refs={row.sourceRefs} />,
  },
];

export const overtimeColumns: DataTableColumn<PayrollInputSnapshot>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
  },
  {
    key: "approvedRequests",
    header: "Approved Requests",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadCount(row.payload, "approvedRequests"),
  },
  {
    key: "totalHours",
    header: "Total Hours",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      return `${payloadNumber(row.payload, "totalHours").toFixed(1)}h`;
    },
  },
  {
    key: "refs",
    header: "",
    className: "w-6",
    cell: (row) => <SourceRefsPopover refs={row.sourceRefs} />,
  },
];

export const reimbursementColumns: DataTableColumn<PayrollInputSnapshot>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
  },
  {
    key: "claims",
    header: "Claims",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => payloadCount(row.payload, "items"),
  },
  {
    key: "totalAmount",
    header: "Total Amount",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      return formatCurrencyFull(payloadNumber(row.payload, "totalAmount"), "INR", "en-IN", 0);
    },
  },
  {
    key: "refs",
    header: "",
    className: "w-6",
    cell: (row) => <SourceRefsPopover refs={row.sourceRefs} />,
  },
];

export const ADJ_STATUS_STYLES: Record<string, string> = {
  pending: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  approved: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  applied: "bg-primary/10 text-foreground border-primary/20",
};

export function buildAdjustmentColumns(
  isLocked: boolean,
  approve: { isPending: boolean; mutate: (id: number) => void },
): DataTableColumn<PayrollAdjustmentListItem>[] {
  const cols: DataTableColumn<PayrollAdjustmentListItem>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
    },
    {
      key: "adjustmentType",
      header: "Type",
      className: "capitalize",
      cell: (row) => row.adjustmentType,
    },
    {
      key: "section",
      header: "Section",
      className: "capitalize",
      cell: (row) => row.section.replace(/_/g, " "),
    },
    {
      key: "reason",
      header: "Reason",
      className: "max-w-48 truncate",
      cell: (row) => row.reason,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={ADJ_STATUS_STYLES[row.status] ?? ""}>
          {row.status}
        </Badge>
      ),
    },
  ];

  if (!isLocked) {
    cols.push({
      key: "actions",
      header: "",
      cell: (row) =>
        row.status === "pending" ? (
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={approve.isPending}
            onClick={() => approve.mutate(row.id)}
          >
            Approve
          </LoadingButton>
        ) : null,
    });
  }

  return cols;
}

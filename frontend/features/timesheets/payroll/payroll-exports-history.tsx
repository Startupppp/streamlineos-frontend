"use client";

import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  useTimesheetPayrollExports,
  payrollExportRowsQueryOptions,
} from "@/hooks/api/timesheets/payroll";
import { applyMapping, downloadPayrollFile } from "./lib/build-payroll-file";
import type { TimesheetExportDto, PayrollMapping } from "./types";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/get-error-message";

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

interface PayrollExportsHistoryProps {
  fallbackMapping: PayrollMapping;
}

export function PayrollExportsHistory({ fallbackMapping }: PayrollExportsHistoryProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = useTimesheetPayrollExports(page, pageSize);
  const qc = useQueryClient();

  const handleDownload = useCallback(
    async (row: TimesheetExportDto) => {
      try {
        const fetched = await qc.fetchQuery(payrollExportRowsQueryOptions(row.id));
        const mapping = fetched.mapping ?? fallbackMapping;
        const { headers, matrix } = applyMapping(fetched.rows, mapping);
        const ext = row.format.toLowerCase() === "xlsx" ? "xlsx" : "csv";
        const filename = `payroll-export_${row.dateRangeStart}_${row.dateRangeEnd}.${ext}`;
        const format2 = row.format.toUpperCase() === "XLSX" ? "XLSX" : "CSV";
        await downloadPayrollFile(format2, filename, headers, matrix);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [qc, fallbackMapping],
  );

  const columns = useMemo<DataTableColumn<TimesheetExportDto>[]>(
    () => [
      {
        key: "period",
        header: "Period",
        cell: (row) => (
          <span className="text-[11px] font-mono">
            {formatDate(row.dateRangeStart)} – {formatDate(row.dateRangeEnd)}
          </span>
        ),
      },
      {
        key: "format",
        header: "Format",
        cell: (row) => (
          <Badge variant="outline" className="text-[10px]">
            {row.format}
          </Badge>
        ),
      },
      {
        key: "entryCount",
        header: "Entries",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block text-[11px]">{row.entryCount}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "totalHours",
        header: "Hours",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block text-[11px]">{row.totalHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "note",
        header: "Note",
        cell: (row) => (
          <span className="text-[11px] text-muted-foreground truncate max-w-[120px] block">
            {row.note ?? "—"}
          </span>
        ),
      },
      {
        key: "createdByName",
        header: "By",
        cell: (row) => (
          <span className="text-[11px] truncate block">{row.createdByName ?? "—"}</span>
        ),
      },
      {
        key: "createdAt",
        header: "When",
        cell: (row) => (
          <span className="text-[11px] text-muted-foreground">{formatDate(row.createdAt)}</span>
        ),
        sortable: true,
        sortValue: (r) => r.createdAt,
      },
      {
        key: "download",
        header: "",
        cell: (row) => <DownloadButton row={row} onDownload={handleDownload} />,
        className: "w-8",
      },
    ],
    [handleDownload],
  );

  const emptyState = (
    <EmptyState
      illustration={<EmptyReportIllustration className="h-32 w-32" />}
      title="No exports yet"
      description="Export a payroll period to see it here."
    />
  );

  return (
    <DataTable
      data={data?.items ?? []}
      columns={columns}
      getRowKey={(r) => r.id}
      isLoading={isLoading}
      emptyState={emptyState}
      pagination={
        data && data.total > pageSize
          ? {
              mode: "server",
              page,
              pageSize,
              total: data.total,
              onPageChange: setPage,
            }
          : undefined
      }
      minWidth="700px"
    />
  );
}

function DownloadButton({
  row,
  onDownload,
}: {
  row: TimesheetExportDto;
  onDownload: (row: TimesheetExportDto) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setLoading(true);
      try {
        await onDownload(row);
      } finally {
        setLoading(false);
      }
    },
    [row, onDownload],
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleClick}
      disabled={loading}
      aria-label="Download export"
    >
      <Download className="h-3.5 w-3.5" />
    </Button>
  );
}

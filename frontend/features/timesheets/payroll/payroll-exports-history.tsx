"use client";

import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CircleCheckIcon, DownloadIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { EmptyReportIllustration } from "@/components/illustrations";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useTimesheetPayrollExports,
  payrollExportRowsQueryOptions,
} from "@/hooks/api/timesheets/payroll";
import { applyMapping, downloadPayrollFile } from "./lib/build-payroll-file";
import { ACK_STATUS_BADGE, ACK_STATUS_LABEL, isAckStatus } from "./types";
import type { TimesheetExportDto, PayrollMapping } from "./types";
import { AckExportDialog } from "./ack-export-dialog";
import { useCan } from "@/hooks/api/access";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/get-error-message";

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

function AckStatusBadge({ row }: { row: TimesheetExportDto }) {
  if (!row.ackStatus || !isAckStatus(row.ackStatus)) {
    return <span className="text-dense text-muted-foreground">—</span>;
  }
  return (
    <Badge
      variant="outline"
      className={`text-micro ${ACK_STATUS_BADGE[row.ackStatus]}`}
      title={row.ackAt ? `Acknowledged ${formatDate(row.ackAt)}` : undefined}
    >
      {ACK_STATUS_LABEL[row.ackStatus]}
    </Badge>
  );
}

interface PayrollExportsHistoryProps {
  fallbackMapping: PayrollMapping;
}

export function PayrollExportsHistory({ fallbackMapping }: PayrollExportsHistoryProps) {
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTimesheetPayrollExports();
  const qc = useQueryClient();
  const canAck = useCan("timesheets:payroll:export");
  const [ackTarget, setAckTarget] = useState<TimesheetExportDto | null>(null);

  const handleAckOpen = useCallback((row: TimesheetExportDto) => setAckTarget(row), []);

  const handleAckOpenChange = useCallback((open: boolean) => {
    if (!open) setAckTarget(null);
  }, []);

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
          <span className="text-dense font-mono">
            {formatDate(row.dateRangeStart)} – {formatDate(row.dateRangeEnd)}
          </span>
        ),
      },
      {
        key: "format",
        header: "Format",
        cell: (row) => (
          <Badge variant="outline" className="text-micro">
            {row.format}
          </Badge>
        ),
      },
      {
        key: "entryCount",
        header: "Entries",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block text-dense">{row.entryCount}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "totalHours",
        header: "Hours",
        cell: (row) => (
          <span className="font-mono tabular-nums text-right block text-dense">{row.totalHours.toFixed(1)}</span>
        ),
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "note",
        header: "Note",
        cell: (row) => (
          <TruncatedText text={row.note ?? "—"} className="text-dense text-muted-foreground max-w-[120px]" />
        ),
      },
      {
        key: "ack",
        header: "Ack",
        cell: (row) => <AckStatusBadge row={row} />,
      },
      {
        key: "createdByName",
        header: "By",
        cell: (row) => (
          <TruncatedText text={row.createdByName ?? "—"} className="text-dense" />
        ),
      },
      {
        key: "createdAt",
        header: "When",
        cell: (row) => (
          <span className="text-dense text-muted-foreground">{formatDate(row.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        cell: (row) => (
          <div className="flex items-center justify-end gap-0.5">
            {canAck && (
              <AnimatedIconButton
                icon={CircleCheckIcon}
                iconSize={14}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleAckOpen(row)}
                aria-label="Record acknowledgement"
                title="Record acknowledgement"
              />
            )}
            <DownloadButton row={row} onDownload={handleDownload} />
          </div>
        ),
        className: "w-16",
      },
    ],
    [handleDownload, canAck, handleAckOpen],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const emptyState = (
    <EmptyState
      illustration={<EmptyReportIllustration className="h-32 w-32" />}
      title="No exports yet"
      description="Export a payroll period to see it here."
    />
  );

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load export history"
        description="Failed to load payroll export history. Please try again."
        onRetry={handleRetry}
        className="flex-1"
      />
    );
  }

  const rows = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <>
      <DataTable
        className="flex-1 min-h-0"
        data={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        emptyState={emptyState}
        pagination={{ pageSize: 20 }}
        minWidth="760px"
      />
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        label="Load more payroll exports"
      />

      {ackTarget && (
        <AckExportDialog
          exportRow={ackTarget}
          open
          onOpenChange={handleAckOpenChange}
        />
      )}
    </>
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
    <AnimatedIconButton
      icon={DownloadIcon}
      iconSize={14}
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleClick}
      disabled={loading}
      aria-label="Download export"
    />
  );
}

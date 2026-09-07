"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { DownloadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const exportJobsListContract = lazyContract(() =>
  import("@/hooks/api/inventory/settings-schema").then((m) => m.exportJobsListContract),
);
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { JOB_STATUS_BADGE, JOB_STATUS_LABEL, type JobStatus } from "@/features/inventory/lib";

function isJobStatus(s: string): s is JobStatus {
  return s === "PENDING" || s === "PROCESSING" || s === "COMPLETED" || s === "FAILED" || s === "CANCELLED";
}
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useCreateExportJob,
  useDownloadExportJob,
  type ExportJob,
  type ExportType,
} from "@/hooks/api/inventory/admin";

interface ExportJobListResponse {
  items: ExportJob[];
  total: number;
  page: number;
  totalPages: number;
}

function useExportJobsWithPolling() {
  return useQuery<ExportJobListResponse, Error>({
    queryKey: queryKeys.inventory.exportJobs(),
    queryFn: ({ signal }) => apiClient.get<ExportJobListResponse>("/inventory/export/jobs", undefined, signal, exportJobsListContract),
    staleTime: 10_000,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const anyActive = items.some(
        (j) => j.status === "PENDING" || j.status === "PROCESSING",
      );
      return anyActive ? 3000 : false;
    },
  });
}

const EXPORT_TYPE_META: Record<string, { label: string; description: string } | undefined> = {
  products: { label: "Products", description: "All products, variants, SKUs, and prices" },
  stock: { label: "Stock Levels", description: "Current on-hand, committed, and on-order quantities" },
  movements: { label: "Stock Movements", description: "Full transaction history up to 10,000 rows" },
  reorder: { label: "Reorder Report", description: "Products at or below their reorder points" },
  valuation: { label: "Valuation", description: "Stock value by product variant" },
  "lots-serials": { label: "Lots & Serials", description: "All lot/serial records and statuses" },
};

const EXPORT_TYPES: ExportType[] = ["products", "stock", "movements", "reorder", "valuation", "lots-serials"];

interface ExportTypeCardProps {
  exportType: ExportType;
  isSelected: boolean;
  onSelect: (t: ExportType) => void;
}

function ExportTypeCard({ exportType, isSelected, onSelect }: ExportTypeCardProps) {
  const meta = EXPORT_TYPE_META[exportType];
  const label = meta?.label ?? exportType;
  const description = meta?.description ?? "";

  function handleClick(): void {
    onSelect(exportType);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-left rounded-lg border p-3 cursor-pointer transition-colors w-full ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
      }`}
    >
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-dense text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}

interface DownloadJobButtonProps {
  onClick: () => void;
  disabled: boolean;
}

function DownloadJobButton({ onClick, disabled }: DownloadJobButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 text-dense font-medium transition-colors ${
        !disabled ? "text-primary hover:text-primary/80" : "text-muted-foreground cursor-not-allowed"
      }`}
      {...hoverHandlers}
    >
      <DownloadIcon ref={iconRef} size={12} aria-hidden="true" />
      Download
    </button>
  );
}

function buildExportJobsColumns(
  onDownload: (job: ExportJob) => void,
  isDownloading: boolean,
): DataTableColumn<ExportJob>[] {
  return [
    {
      key: "jobType",
      header: "Type",
      className: "text-xs capitalize",
      cell: (job) => EXPORT_TYPE_META[job.jobType]?.label ?? job.jobType,
    },
    {
      key: "status",
      header: "Status",
      cell: (job) => (
        <Badge className={isJobStatus(job.status) ? JOB_STATUS_BADGE[job.status] : ""}>
          {isJobStatus(job.status) ? JOB_STATUS_LABEL[job.status] : job.status}
        </Badge>
      ),
    },
    {
      key: "totalRows",
      header: "Total Rows",
      className: "text-xs",
      cell: (job) => job.totalRows,
    },
    {
      key: "createdAt",
      header: "Created",
      className: "text-xs text-muted-foreground",
      cell: (job) => new Date(job.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (job) => {
        const isCompleted = job.status === "COMPLETED";
        function handleDownloadClick(): void {
          onDownload(job);
        }
        return <DownloadJobButton onClick={handleDownloadClick} disabled={!isCompleted || isDownloading} />;
      },
    },
  ];
}

interface ExportJobsTableProps {
  jobs: ExportJob[];
  isLoading: boolean;
  onDownload: (job: ExportJob) => void;
  isDownloading: boolean;
}

function ExportJobsTable({ jobs, isLoading, onDownload, isDownloading }: ExportJobsTableProps) {
  const columns = React.useMemo(
    () => buildExportJobsColumns(onDownload, isDownloading),
    [onDownload, isDownloading],
  );

  return (
    <DataTable
      data={jobs}
      columns={columns}
      getRowKey={(job) => job.id}
      isLoading={isLoading}
      emptyState={<div className="py-8 text-center text-sm text-muted-foreground">No export jobs yet.</div>}
    />
  );
}

export function ExportTab() {
  const canExport = useCan("inventory:export");
  const [selectedExportType, setSelectedExportType] = React.useState<ExportType | null>(null);

  const createExportJob = useCreateExportJob();
  const downloadMutation = useDownloadExportJob();

  const { data: exportJobsData, isLoading: isLoadingJobs } = useExportJobsWithPolling();
  const liveJobs = exportJobsData?.items ?? [];
  const hasActiveJobs = liveJobs.some(
    (j) => j.status === "PENDING" || j.status === "PROCESSING",
  );

  function handleExportTypeSelect(t: ExportType): void {
    setSelectedExportType(t);
  }

  function handleStartExport(): void {
    if (!selectedExportType) return;
    createExportJob.mutate(
      { exportType: selectedExportType },
      {
        onSuccess: () => {
          toast.success("Export job started. Check the table below for progress.");
          setSelectedExportType(null);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  function handleDownload(job: ExportJob): void {
    downloadMutation.mutate(job.id, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = job.fileName ?? `export-${job.jobType}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  if (!canExport) {
    return (
      <InventoryEmptyState
        title="Access Denied"
        description="You don't have permission to export inventory data."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-semibold">Export Data</CardTitle>
          <CardAction>
            <Link
              href="/inventory/reports/stock-summary"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Reports <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-3">Select a data type to export as CSV:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPORT_TYPES.map(function renderExportTypeCard(t) {
                return (
                  <ExportTypeCard
                    key={t}
                    exportType={t}
                    isSelected={selectedExportType === t}
                    onSelect={handleExportTypeSelect}
                  />
                );
              })}
            </div>
          </div>

          {selectedExportType !== null && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Ready to export: {EXPORT_TYPE_META[selectedExportType]?.label ?? selectedExportType}
                </p>
                <p className="text-dense text-muted-foreground">
                  {EXPORT_TYPE_META[selectedExportType]?.description ?? ""}
                </p>
              </div>
              <LoadingButton
                size="sm"
                className="text-xs ml-4 shrink-0"
                isPending={createExportJob.isPending}
                loadingText="Starting…"
                onClick={handleStartExport}
              >
                Start Export
              </LoadingButton>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">Export History</p>
          {hasActiveJobs && (
            <span className="text-micro text-muted-foreground">Auto-refreshing…</span>
          )}
        </div>
        <ExportJobsTable
          jobs={liveJobs}
          isLoading={isLoadingJobs}
          onDownload={handleDownload}
          isDownloading={downloadMutation.isPending}
        />
      </div>
    </div>
  );
}

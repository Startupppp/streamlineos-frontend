"use client";

import * as React from "react";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DownloadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useCan } from "@/hooks/api/access";
import { JOB_STATUS_BADGE, JOB_STATUS_LABEL, type JobStatus } from "@/features/inventory/lib";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useImportPreview,
  useCreateImportJob,
  useImportJobs,
  useCreateExportJob,
  useDownloadExportJob,
} from "@/hooks/api/inventory/admin";
import type { ImportPreviewResult, ExportJob, ExportType } from "@/hooks/api/inventory/admin";
import { ImportTypeStep, type ImportType } from "./import-type-step";
import { ImportPreviewStep } from "./import-preview-step";
import { ImportResultStep } from "./import-result-step";

interface ExportJobListResponse {
  items: ExportJob[];
  total: number;
  page: number;
  totalPages: number;
}

function useExportJobsWithPolling() {
  return useQuery<ExportJobListResponse, Error>({
    queryKey: queryKeys.inventory.exportJobs(),
    queryFn: () => apiClient.get<ExportJobListResponse>("/inventory/export/jobs"),
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

type Step = "type" | "preview" | "running" | "done";

const STEP_LABELS: Record<Step, string> = {
  type: "1. Select Type",
  preview: "2. Upload & Preview",
  running: "3. Running",
  done: "4. Done",
};

const EXPORT_TYPE_META: Record<ExportType, { label: string; description: string }> = {
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
      <p className="text-xs font-semibold text-foreground">{meta.label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{meta.description}</p>
    </button>
  );
}

interface ExportJobsTableProps {
  jobs: ExportJob[];
  isLoading: boolean;
  onDownload: (job: ExportJob) => void;
  isDownloading: boolean;
}

function DownloadJobButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
        !disabled ? "text-primary hover:text-primary/80" : "text-muted-foreground cursor-not-allowed"
      }`}
      {...hoverHandlers}
    >
      <DownloadIcon ref={iconRef} size={12} aria-hidden="true" />
      Download
    </button>
  );
}

const EXPORT_JOBS_COLUMNS: (onDownload: (job: ExportJob) => void, isDownloading: boolean) => DataTableColumn<ExportJob>[] =
  (onDownload, isDownloading) => [
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
        <Badge className={JOB_STATUS_BADGE[job.status]}>
          {JOB_STATUS_LABEL[job.status]}
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

function ExportJobsTable({ jobs, isLoading, onDownload, isDownloading }: ExportJobsTableProps) {
  const columns = React.useMemo(
    () => EXPORT_JOBS_COLUMNS(onDownload, isDownloading),
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

function ExportTab() {
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
    <div className="space-y-6">
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
                  Ready to export: {EXPORT_TYPE_META[selectedExportType].label}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {EXPORT_TYPE_META[selectedExportType].description}
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

      <Card>
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-semibold">Export History</CardTitle>
          {hasActiveJobs && (
            <span className="text-[10px] text-muted-foreground">Auto-refreshing…</span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ExportJobsTable
            jobs={liveJobs}
            isLoading={isLoadingJobs}
            onDownload={handleDownload}
            isDownloading={downloadMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface ImportJobRow {
  id: number;
  importType: string;
  status: JobStatus;
  totalRows: number;
  processedRows: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
}

const IMPORT_HISTORY_COLUMNS: DataTableColumn<ImportJobRow>[] = [
  {
    key: "id",
    header: "ID",
    className: "text-xs font-mono",
    cell: (job) => job.id,
  },
  {
    key: "importType",
    header: "Type",
    className: "text-xs capitalize",
    cell: (job) => job.importType,
  },
  {
    key: "status",
    header: "Status",
    cell: (job) => (
      <Badge className={JOB_STATUS_BADGE[job.status]}>
        {JOB_STATUS_LABEL[job.status]}
      </Badge>
    ),
  },
  {
    key: "totalRows",
    header: "Total",
    className: "text-xs",
    cell: (job) => job.totalRows,
  },
  {
    key: "processedRows",
    header: "Processed",
    className: "text-xs",
    cell: (job) => job.processedRows,
  },
  {
    key: "errorCount",
    header: "Errors",
    cell: (job) => (
      <span className={`text-xs ${job.errorCount > 0 ? "text-red-600 font-medium" : ""}`}>
        {job.errorCount}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    className: "text-xs text-muted-foreground",
    cell: (job) => new Date(job.createdAt).toLocaleDateString(),
  },
  {
    key: "completedAt",
    header: "Completed",
    className: "text-xs text-muted-foreground",
    cell: (job) => (job.completedAt ? new Date(job.completedAt).toLocaleDateString() : "—"),
  },
];

export function ImportClient() {
  const canImport = useCan("inventory:import");
  const [step, setStep] = React.useState<Step>("type");
  const [selectedType, setSelectedType] = React.useState<ImportType | null>(null);
  const [preview, setPreview] = React.useState<ImportPreviewResult | null>(null);
  const [jobId, setJobId] = React.useState<number | null>(null);

  const previewMutation = useImportPreview();
  const createJobMutation = useCreateImportJob();
  const { data: jobsData, isLoading: isJobsLoading } = useImportJobs();

  function handleTypeSelect(type: ImportType): void {
    setSelectedType(type);
    setStep("preview");
    setPreview(null);
  }

  async function handleUpload(file: File): Promise<void> {
    if (!selectedType) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("importType", selectedType);
    try {
      const result = await previewMutation.mutateAsync(fd);
      setPreview(result);
    } catch {
      toast.error("Failed to preview file. Check the format and try again.");
    }
  }

  async function handleConfirm(): Promise<void> {
    if (!selectedType || !preview) return;
    try {
      const job = await createJobMutation.mutateAsync({
        importType: selectedType,
        rows: preview.sample,
      });
      setJobId(job.id);
      setStep("running");
    } catch {
      toast.error("Failed to start import job.");
    }
  }

  function handleReset(): void {
    setStep("type");
    setSelectedType(null);
    setPreview(null);
    setJobId(null);
  }

  const tabTriggerClass =
    "h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-sm";

  return (
    <PageWrapper
      title="Import & Export"
      subtitle="Import products, vendors, stock, and more from CSV or Excel files. Export data for offline analysis."
    >
      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="w-full justify-start border-b bg-transparent p-0 rounded-none shrink-0">
          <TabsTrigger value="import" className={tabTriggerClass}>Import</TabsTrigger>
          <TabsTrigger value="export" className={tabTriggerClass}>Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6 mt-0">
          {!canImport ? (
            <InventoryEmptyState
              title="Access Denied"
              description="You don't have permission to import inventory data."
            />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {(["type", "preview", "running", "done"] as Step[]).map(function renderStep(s) {
                      return (
                        <span
                          key={s}
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            s === step
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {STEP_LABELS[s]}
                        </span>
                      );
                    })}
                  </div>
                </CardHeader>
                <CardContent>
                  {step === "type" && (
                    <ImportTypeStep selected={selectedType} onSelect={handleTypeSelect} />
                  )}
                  {step === "preview" && selectedType && (
                    <ImportPreviewStep
                      importType={selectedType}
                      isPreviewing={previewMutation.isPending}
                      preview={preview}
                      onUpload={handleUpload}
                      onConfirm={handleConfirm}
                      isConfirming={createJobMutation.isPending}
                    />
                  )}
                  {(step === "running" || step === "done") && jobId !== null && (
                    <ImportResultStep jobId={jobId} onReset={handleReset} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Import History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable
                    data={jobsData?.items ?? []}
                    columns={IMPORT_HISTORY_COLUMNS}
                    getRowKey={(job) => job.id}
                    isLoading={isJobsLoading}
                    emptyState={<div className="py-8 text-center text-sm text-muted-foreground">No import jobs yet.</div>}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-6 mt-0">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

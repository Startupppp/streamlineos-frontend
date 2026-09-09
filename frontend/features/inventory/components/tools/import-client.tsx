"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { JOB_STATUS_BADGE, JOB_STATUS_LABEL, type JobStatus } from "@/features/inventory/lib";
import { useImportPreview, useImportJobs } from "@/hooks/api/inventory/admin";
import type { ImportPreviewResult } from "@/hooks/api/inventory/admin";
import type { StagedImportType } from "@/hooks/api/inventory/staged-import";
import { ImportTypeStep, type ImportType } from "./import-type-step";
import { ImportPreviewStep } from "./import-preview-step";
import { StagedImportRunner } from "./staged-import-runner";
import { ImportResultStep } from "./import-result-step";
import { AppSheet } from "@/components/shared";
import { ExportTab } from "./export-tab";

type Step = "type" | "preview" | "running";

const STEP_LABELS: Record<Step, string> = {
  type: "1. Select Type",
  preview: "2. Upload & Preview",
  running: "3. Import",
};

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
      <span className={`text-xs ${job.errorCount > 0 ? "text-status-danger-ink font-medium" : ""}`}>
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
  const canView = useCan("inventory:import");
  const canImport = useCan("inventory:import");

  function handleRetryJobs(): void {
    void refetchJobs();
  }
  const [step, setStep] = React.useState<Step>("type");
  const [selectedType, setSelectedType] = React.useState<ImportType | null>(null);
  const [preview, setPreview] = React.useState<ImportPreviewResult | null>(null);
  /**
   * Kept because the import is driven from the file's own rows.
   *
   * The previous flow sent `preview.sample` to the single-shot job endpoint, and
   * the backend defines that sample as `rows.slice(0, 20)` — so importing five
   * thousand products applied twenty of them under a job that read COMPLETED.
   * The staged routes take the whole file in chunks, which means the file has to
   * survive the preview step.
   */
  const [file, setFile] = React.useState<File | null>(null);
  /**
   * A past job's rejected rows had no way in at all: the history table listed an
   * error count and nothing opened it.
   */
  const [inspectingJobId, setInspectingJobId] = React.useState<number | null>(null);

  const previewMutation = useImportPreview();
  const {
    data: jobsData,
    isLoading: isJobsLoading,
    isError: isJobsError,
    error: jobsError,
    refetch: refetchJobs,
  } = useImportJobs();

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
      setFile(file);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleConfirm(): void {
    if (!selectedType || !preview || !file) return;
    setStep("running");
  }

  function handleReset(): void {
    setStep("type");
    setSelectedType(null);
    setPreview(null);
    setFile(null);
  }

  function handleInspectJob(job: ImportJobRow): void {
    setInspectingJobId(job.id);
  }

  function handleInspectClose(open: boolean): void {
    if (!open) setInspectingJobId(null);
  }

  // G8. Denied is not empty. Placed after every hook, not at the top of
  // the component: an early return above a useState or useQuery makes the
  // hook order depend on a permission, which React forbids and which only
  // shows up for the user who lacks the key.
  if (!canView) {
    return (
      <PageWrapper title="Import & Export">
        <NoPermissionState permission="inventory:import" className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Import & Export"
      subtitle="Import products, vendors, stock, and more from CSV or Excel files. Export data for offline analysis."
    >
      <Tabs defaultValue="import" className="flex flex-1 min-h-0 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className={TABS_CONTENT_PAGE_BODY_CLASS}>
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
                    {(["type", "preview", "running"] as Step[]).map(function renderStep(s) {
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
                      isConfirming={false}
                    />
                  )}
                  {step === "running" && selectedType && file && (
                    <StagedImportRunner
                      file={file}
                      importType={selectedType as StagedImportType}
                      onDone={handleReset}
                    />
                  )}
                </CardContent>
              </Card>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Import History</p>
                {isJobsError ? (
                  // G8. A failed history read used to render the empty table, so
                  // "we could not fetch your imports" and "you have never imported
                  // anything" looked identical — and the second sends somebody off
                  // to re-run an import that already succeeded.
                  <ErrorState
                    className="flex-1"
                    title="Couldn't load import history"
                    description={getErrorMessage(jobsError)}
                    onRetry={handleRetryJobs}
                  />
                ) : (
                  <DataTable
                    data={jobsData?.items ?? []}
                    columns={IMPORT_HISTORY_COLUMNS}
                    getRowKey={(job) => job.id}
                    isLoading={isJobsLoading}
                    className="flex-1 min-h-0"
                    onRowClick={handleInspectJob}
                    emptyState={<div className="py-8 text-center text-sm text-muted-foreground">No import jobs yet.</div>}
                  />
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="export" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <ExportTab />
        </TabsContent>
      </Tabs>

      <AppSheet
        open={inspectingJobId !== null}
        onOpenChange={handleInspectClose}
        title="Import job"
        description="What this run applied, and every row it rejected."
      >
        {inspectingJobId === null ? null : (
          <ImportResultStep jobId={inspectingJobId} onReset={() => setInspectingJobId(null)} />
        )}
      </AppSheet>
    </PageWrapper>
  );
}

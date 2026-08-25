"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useCan } from "@/hooks/api/access";
import { JOB_STATUS_BADGE, JOB_STATUS_LABEL, type JobStatus } from "@/features/inventory/lib";
import {
  useImportPreview,
  useCreateImportJob,
  useImportJobs,
} from "@/hooks/api/inventory/admin";
import type { ImportPreviewResult } from "@/hooks/api/inventory/admin";
import { ImportTypeStep, type ImportType } from "./import-type-step";
import { ImportPreviewStep } from "./import-preview-step";
import { ImportResultStep } from "./import-result-step";
import { ExportTab } from "./export-tab";

type Step = "type" | "preview" | "running" | "done";

const STEP_LABELS: Record<Step, string> = {
  type: "1. Select Type",
  preview: "2. Upload & Preview",
  running: "3. Running",
  done: "4. Done",
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

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Import History</p>
                <DataTable
                  data={jobsData?.items ?? []}
                  columns={IMPORT_HISTORY_COLUMNS}
                  getRowKey={(job) => job.id}
                  isLoading={isJobsLoading}
                  className="flex-1 min-h-0"
                  emptyState={<div className="py-8 text-center text-sm text-muted-foreground">No import jobs yet.</div>}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="export" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <ExportTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

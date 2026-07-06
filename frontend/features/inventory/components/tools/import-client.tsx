"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCan } from "@/hooks/api/access";
import { JOB_STATUS_BADGE, JOB_STATUS_LABEL } from "@/features/inventory/lib";
import {
  useImportPreview,
  useCreateImportJob,
  useImportJobs,
} from "@/hooks/api/inventory/admin";
import type { ImportPreviewResult } from "@/hooks/api/inventory/admin";
import { ImportTypeStep, type ImportType } from "./import-type-step";
import { ImportPreviewStep } from "./import-preview-step";
import { ImportResultStep } from "./import-result-step";

type Step = "type" | "preview" | "running" | "done";

const STEP_LABELS: Record<Step, string> = {
  type: "1. Select Type",
  preview: "2. Upload & Preview",
  running: "3. Running",
  done: "4. Done",
};

export function ImportClient() {
  const canImport = useCan("inventory:import");
  const [step, setStep] = React.useState<Step>("type");
  const [selectedType, setSelectedType] = React.useState<ImportType | null>(null);
  const [preview, setPreview] = React.useState<ImportPreviewResult | null>(null);
  const [jobId, setJobId] = React.useState<number | null>(null);

  const previewMutation = useImportPreview();
  const createJobMutation = useCreateImportJob();
  const { data: jobsData, isLoading: isJobsLoading } = useImportJobs();

  if (!canImport) {
    return (
      <PageWrapper eyebrow="Operations · Inventory" title="Import" subtitle="">
        <InventoryEmptyState
          title="Access Denied"
          description="You don't have permission to import inventory data."
        />
      </PageWrapper>
    );
  }

  function handleTypeSelect(type: ImportType) {
    setSelectedType(type);
    setStep("preview");
    setPreview(null);
  }

  async function handleUpload(file: File) {
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

  async function handleConfirm() {
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

  function handleReset() {
    setStep("type");
    setSelectedType(null);
    setPreview(null);
    setJobId(null);
  }

  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Import"
      subtitle="Import products, vendors, stock, and more from CSV or Excel files."
    >
      <div className="space-y-6">
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
            {isJobsLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map(function renderSkeleton(_, i) {
                  return <Skeleton key={i} className="h-8 w-full" />;
                })}
              </div>
            ) : !jobsData?.items.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No import jobs yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsData.items.map(function renderJobRow(job) {
                      return (
                        <TableRow key={job.id}>
                          <TableCell className="text-xs font-mono">{job.id}</TableCell>
                          <TableCell className="text-xs capitalize">{job.importType}</TableCell>
                          <TableCell>
                            <Badge className={JOB_STATUS_BADGE[job.status]}>
                              {JOB_STATUS_LABEL[job.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{job.totalRows}</TableCell>
                          <TableCell className="text-xs">{job.processedRows}</TableCell>
                          <TableCell className={`text-xs ${job.errorCount > 0 ? "text-red-600 font-medium" : ""}`}>
                            {job.errorCount}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

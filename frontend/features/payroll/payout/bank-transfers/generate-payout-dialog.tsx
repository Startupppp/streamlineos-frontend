"use client";

import { toast } from "sonner";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { useCreatePayoutBatch } from "@/hooks/api/payroll/payout-batches";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BatchFormat } from "@/types/payroll";

function getRecommendedFormat(currency: string | undefined): BatchFormat {
  if (currency === "INR") return "NEFT_CSV";
  if (currency === "USD") return "ACH_CSV";
  if (currency === "EUR") return "SEPA_CSV";
  return "GENERIC_CSV";
}

interface GeneratePayoutDialogProps {
  open: boolean;
  onClose: () => void;
  runId: number;
  employeeCount: number | null;
  format: BatchFormat;
  onFormatChange: (format: BatchFormat) => void;
  idempotencyKey: string;
  generatedBatchId: number | null;
  onGenerated: (batchId: number) => void;
  onDownload: (batchId: number) => void;
  isDownloading: boolean;
}

export function GeneratePayoutDialog({
  open,
  onClose,
  runId,
  employeeCount,
  format,
  onFormatChange,
  idempotencyKey,
  generatedBatchId,
  onGenerated,
  onDownload,
  isDownloading,
}: GeneratePayoutDialogProps) {
  const createMutation = useCreatePayoutBatch();
  const { data: policyData } = usePayrollPolicyCurrent();
  const recommendedFormat = getRecommendedFormat(policyData?.policy?.currency);

  function handleDownload() {
    if (generatedBatchId !== null) onDownload(generatedBatchId);
  }

  function handleGenerate() {
    createMutation.mutate(
      { runId, format: format === recommendedFormat ? undefined : format, idempotencyKey },
      {
        onSuccess: (result) => {
          if (result.replayed) toast.info("Replayed existing batch");
          const batchId = result.batches[0]?.batch.id ?? null;
          if (batchId !== null) {
            onGenerated(batchId);
          } else {
            onClose();
          }
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Payout Batch</DialogTitle>
          <DialogDescription>
            {employeeCount ?? 0} employee(s) will be included in this batch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {generatedBatchId !== null ? (
            <div className="flex items-center gap-2 rounded-lg border border-status-success-rule bg-status-success-surface p-3 text-sm text-status-success-ink">
              <Download className="h-4 w-4 shrink-0" />
              <span>Batch generated successfully.</span>
              <LoadingButton
                size="sm"
                variant="outline"
                className="ml-auto"
                isPending={isDownloading}
                loadingText="Preparing…"
                onClick={handleDownload}
              >
                Download Bank File
              </LoadingButton>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="batch-format">Format</Label>
                <Select
                  value={format}
                  onValueChange={(v) => onFormatChange(v as BatchFormat)}
                >
                  <SelectTrigger id="batch-format" className="">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["NEFT_CSV", "RTGS_CSV", "ACH_CSV", "SEPA_CSV", "GENERIC_CSV"] as const).map((f) => (
                      <SelectItem key={f} value={f}>
                        {f.replace("_CSV", " CSV").replace("_", " ")}
                        {f === recommendedFormat && (
                          <span className="ml-1.5 text-micro text-muted-foreground">(recommended)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-dense text-muted-foreground leading-snug">
                A short-lived signed download link is issued on request, so the bank file can
                be downloaded again from the batch list at any time.
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {generatedBatchId !== null ? "Close" : "Cancel"}
          </Button>
          {generatedBatchId === null && (
            <LoadingButton
              onClick={handleGenerate}
              isPending={createMutation.isPending}
              loadingText="Generating…"
            >
              Generate
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

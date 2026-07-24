"use client";

import { toast } from "sonner";
import { Download, ExternalLink } from "lucide-react";
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
  fileUrl: string | null;
  onFileUrl: (url: string) => void;
}

export function GeneratePayoutDialog({
  open,
  onClose,
  runId,
  employeeCount,
  format,
  onFormatChange,
  idempotencyKey,
  fileUrl,
  onFileUrl,
}: GeneratePayoutDialogProps) {
  const createMutation = useCreatePayoutBatch();
  const { data: policyData } = usePayrollPolicyCurrent();
  const recommendedFormat = getRecommendedFormat(policyData?.policy?.currency);

  function handleGenerate() {
    createMutation.mutate(
      { runId, format: format === recommendedFormat ? undefined : format, idempotencyKey },
      {
        onSuccess: (result) => {
          if (result.replayed) toast.info("Replayed existing batch");
          const generatedFileUrl = result.batches.find((b) => b.fileUrl)?.fileUrl ?? null;
          if (generatedFileUrl) {
            onFileUrl(generatedFileUrl);
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
          {fileUrl ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Download className="h-4 w-4 shrink-0" />
              <span>Batch generated successfully.</span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 font-medium underline underline-offset-2"
              >
                Download Bank File
                <ExternalLink className="h-3 w-3" />
              </a>
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
                          <span className="ml-1.5 text-[10px] text-muted-foreground">(recommended)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                A signed download link will be available immediately after generation. To
                re-download, generate a new batch.
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {fileUrl ? "Close" : "Cancel"}
          </Button>
          {!fileUrl && (
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

"use client";

import { toast } from "sonner";
import { Loader2, Download, ExternalLink } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useCreatePayoutBatch } from "@/hooks/api/payroll/payout-batches";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BatchFormat } from "@/types/payroll";

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

  function handleGenerate() {
    createMutation.mutate(
      { runId, format, idempotencyKey },
      {
        onSuccess: (result) => {
          if (result.replayed) toast.info("Replayed existing batch");
          if (result.fileUrl) {
            onFileUrl(result.fileUrl);
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
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
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
                  <SelectTrigger id="batch-format" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEFT_CSV">NEFT CSV</SelectItem>
                    <SelectItem value="RTGS_CSV">RTGS CSV</SelectItem>
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
            <Button onClick={handleGenerate} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Generate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

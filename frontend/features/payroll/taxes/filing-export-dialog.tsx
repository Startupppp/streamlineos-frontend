"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeys } from "@/lib/query-keys";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import {
  FILING_EXPORT_TERMINAL,
  usePrepareFilingExport,
  useFilingExportJob,
  type FilingType,
} from "@/hooks/api/payroll/filings";
import type { PayrollEntity } from "@/hooks/api/payroll/entities";

interface FilingExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportedTypes: FilingType[];
  typeLabels: Record<FilingType, string>;
  indiaEntities: PayrollEntity[];
  honestyLabel: string;
  ruleBundle: string | undefined;
  currentFy: string;
  defaultMonth: string;
}

/**
 * The backend prepares the CSV on the payroll jobs worker, so this dialog holds
 * the job handle and polls it rather than waiting on the request.
 */
export function FilingExportDialog({
  open,
  onOpenChange,
  supportedTypes,
  typeLabels,
  indiaEntities,
  honestyLabel,
  ruleBundle,
  currentFy,
  defaultMonth,
}: FilingExportDialogProps) {
  const qc = useQueryClient();
  const prepareMutation = usePrepareFilingExport();

  const [exportType, setExportType] = useState<FilingType>("PF_ECR");
  const [exportMonth, setExportMonth] = useState(defaultMonth);
  const [exportEntityId, setExportEntityId] = useState<string>("");
  const [exportJobId, setExportJobId] = useState<number | null>(null);
  const { data: exportJob } = useFilingExportJob(exportJobId);
  const reportedJobRef = useRef<number | null>(null);

  const jobSettled = exportJob != null && FILING_EXPORT_TERMINAL.includes(exportJob.status);
  const jobInFlight = exportJobId !== null && !jobSettled;

  useEffect(() => {
    if (!exportJob || !FILING_EXPORT_TERMINAL.includes(exportJob.status)) return;
    if (exportJob.jobId === reportedJobRef.current) return;
    reportedJobRef.current = exportJob.jobId;
    if (exportJob.status === "SUCCEEDED") {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.filingsAll });
      toast.success(exportJob.statusLabel, {
        description: "The CSV is ready to download from the list below.",
      });
      return;
    }
    toast.error("Export failed", {
      description: exportJob.errorMessage ?? "The statutory export could not be prepared.",
    });
  }, [exportJob, qc]);

  function handleTypeChange(value: string) {
    const next = supportedTypes.find((type) => type === value);
    if (next) setExportType(next);
  }

  function handleExportConfirm() {
    prepareMutation.mutate(
      {
        filingType: exportType,
        fiscalYear: currentFy,
        month: exportMonth,
        ...(exportEntityId !== "" ? { entityId: Number(exportEntityId) } : {}),
      },
      {
        onSuccess: (job) => {
          reportedJobRef.current = null;
          setExportJobId(job.jobId);
          toast.success("Export queued", {
            description: `Preparing the ${exportMonth} artifact. ${honestyLabel}.`,
          });
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prepare filing export</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="space-y-1.5">
            <label className="block text-label font-medium text-foreground">
              Filing type
            </label>
            <Select value={exportType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabels[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-label font-medium text-foreground">
              Payroll month
            </label>
            <MonthPicker value={exportMonth} onChange={setExportMonth} className="w-full" />
            <p className="text-dense text-muted-foreground">
              Uses the REGULAR run for this month when present. Empty CSV if no run/lines
              match.
            </p>
          </div>
          {indiaEntities.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-label font-medium text-foreground">
                Legal entity (India)
              </label>
              <Select value={exportEntityId || undefined} onValueChange={setExportEntityId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional — prefer entity run" />
                </SelectTrigger>
                <SelectContent>
                  {indiaEntities.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.legalName} ({e.countryCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-dense text-muted-foreground">
                India PF/ESI/TDS export builders only. Non-IN entities are blocked on the
                server.
              </p>
            </div>
          )}
          <p className="text-dense text-muted-foreground">
            Financial year {currentFy}
            {ruleBundle ? ` · rule ${ruleBundle}` : ""}. {honestyLabel}.
            {exportType === "FORM16"
              ? " Form 16 full certificate is not generated — period summary only."
              : ""}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            onClick={handleExportConfirm}
            isPending={prepareMutation.isPending || jobInFlight}
            loadingText="Preparing…"
          >
            Prepare export
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

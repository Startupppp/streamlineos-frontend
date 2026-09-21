"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  usePayrollFilings,
  useFilingCapabilities,
  useAttachAcknowledgement,
  downloadFilingExport,
  type PayrollFiling,
  type FilingType,
  type FilingStatus,
} from "@/hooks/api/payroll/filings";
import { usePayrollEntities } from "@/hooks/api/payroll/entities";
import { FilingExportDialog } from "./filing-export-dialog";

const FALLBACK_HONESTY_LABEL = "Export prepared — external filing required";
const FALLBACK_CAPABILITY_NOTE =
  "StreamlineOS prepares statutory export artifacts and tracks challan/acknowledgement references. Filing with EPFO/ESIC/tax portals is not automatic until a provider is connected.";

const FILING_TYPE_LABEL: Record<FilingType, string> = {
  PF_ECR: "PF ECR",
  ESI: "ESI",
  PT: "Professional Tax",
  TDS_24Q: "TDS (Form 24Q)",
  FORM16: "Form 16 (summary only)",
  LWF: "Labour Welfare Fund",
};

const FILING_TYPE_OPTIONS: FilingType[] = ["PF_ECR", "ESI", "PT", "TDS_24Q", "FORM16", "LWF"];

const STATUS_BADGE: Record<FilingStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  EXPORT_PREPARED:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  SUBMITTED:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  ACKNOWLEDGED:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  RECONCILED:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  FAILED:
    "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const STATUS_LABEL: Record<FilingStatus, string> = {
  DRAFT: "Draft",
  EXPORT_PREPARED: "Export prepared",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  RECONCILED: "Reconciled",
  FAILED: "Failed",
};

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

function getDefaultMonth(): string {
  const now = new Date();
  // Prefer previous month for payroll filings
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: FilingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-dense font-medium ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function FilingsTab() {
  const canManage = useCan("payroll:tax:manage");
  const { data, isLoading, isError, error, refetch } = usePayrollFilings();
  const { data: capability } = useFilingCapabilities();
  const { data: entities } = usePayrollEntities();
  const ackMutation = useAttachAcknowledgement();

  const honestyLabel = capability?.honestyLabel ?? FALLBACK_HONESTY_LABEL;
  const capabilityNote = capability?.note ?? FALLBACK_CAPABILITY_NOTE;
  const supportedTypes = capability?.supportedTypes ?? FILING_TYPE_OPTIONS;
  const ruleBundle = capability?.ruleBundleVersion;
  const indiaEntities = (entities ?? []).filter((e) => e.countryCode.toUpperCase() === "IN");

  const [showExport, setShowExport] = useState(false);
  const [ackTarget, setAckTarget] = useState<PayrollFiling | null>(null);
  const [challanRef, setChallanRef] = useState("");
  const [ackRef, setAckRef] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  function handleRetry() {
    void refetch();
  }
  async function handleDownload(filing: PayrollFiling) {
    if (downloadingId != null) return;
    setDownloadingId(filing.id);
    try {
      await downloadFilingExport(filing.id);
      toast.success("CSV export downloaded");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  function handleAckOpen(filing: PayrollFiling) {
    setAckTarget(filing);
    setChallanRef(filing.challanRef ?? "");
    setAckRef(filing.acknowledgementRef ?? "");
  }

  function handleAckConfirm() {
    if (!ackTarget) return;
    if (!challanRef.trim() && !ackRef.trim()) {
      toast.error("Enter a challan or acknowledgement reference");
      return;
    }
    ackMutation.mutate(
      {
        filingId: ackTarget.id,
        challanRef: challanRef.trim() || undefined,
        acknowledgementRef: ackRef.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Acknowledgement recorded");
          setAckTarget(null);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const columns: DataTableColumn<PayrollFiling>[] = [
    {
      key: "filingType",
      header: "Filing",
      cell: (row: PayrollFiling) => (
        <span className="text-label font-medium text-foreground">
          {FILING_TYPE_LABEL[row.filingType]}
        </span>
      ),
    },
    {
      key: "fiscalYear",
      header: "Period / FY",
      cell: (row: PayrollFiling) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.fiscalYear ?? "—"}
          {row.ruleVersion ? (
            <span className="ml-1 text-micro opacity-80">· {row.ruleVersion}</span>
          ) : null}
          {row.entityId != null ? (
            <span className="ml-1 text-micro opacity-80">· entity #{row.entityId}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: PayrollFiling) => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge status={row.status} />
          {row.statusLabel && (
            <span className="text-dense text-muted-foreground">{row.statusLabel}</span>
          )}
        </div>
      ),
    },
    {
      key: "ref",
      header: "Challan / Ack. ref",
      cell: (row: PayrollFiling) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.acknowledgementRef ?? row.challanRef ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: PayrollFiling) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {row.status !== "DRAFT" && (
            <LoadingButton
              size="sm"
              variant="outline"
              onClick={() => void handleDownload(row)}
              isPending={downloadingId === row.id}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              CSV
            </LoadingButton>
          )}
          {canManage && row.status !== "ACKNOWLEDGED" && row.status !== "RECONCILED" ? (
            <Button size="sm" variant="outline" onClick={() => handleAckOpen(row)}>
              Record acknowledgement
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      <div
        role="status"
        className="flex gap-2.5 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2.5"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-ink" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-status-warning-ink">
            {honestyLabel}
            {ruleBundle ? (
              <span className="ml-1.5 font-normal text-status-warning-ink">
                · rule {ruleBundle}
              </span>
            ) : null}
          </p>
          <p className="text-dense leading-snug text-status-warning-ink">
            {capabilityNote}
            {capability && !capability.automaticFiling && !capability.automaticRemittance
              ? " Automatic filing and remittance are not available."
              : null}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Build CSV exports from a payroll run month, submit them on the government portal,
          then record the acknowledgement. StreamlineOS does not file returns or pay
          challans on your behalf.
        </p>
        {canManage && (
          <Button size="sm" className="shrink-0" onClick={() => setShowExport(true)}>
            Prepare filing export
          </Button>
        )}
      </div>

      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load filings"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={data?.data ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          minWidth="720px"
          mobileCard={(row) => (
            <div className="flex flex-col gap-1.5 px-1 py-2">
              <div className="flex items-center justify-between">
                <span className="text-label font-medium text-foreground">
                  {FILING_TYPE_LABEL[row.filingType]}
                </span>
                <StatusBadge status={row.status} />
              </div>
              {row.statusLabel && (
                <span className="text-dense text-muted-foreground">{row.statusLabel}</span>
              )}
              <div className="flex items-center justify-between text-dense text-muted-foreground tabular-nums">
                <span>{row.fiscalYear ?? "—"}</span>
                <span>{row.acknowledgementRef ?? row.challanRef ?? "No ref"}</span>
              </div>
              <div className="mt-1 flex gap-1.5">
                {row.status !== "DRAFT" && (
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => void handleDownload(row)}
                    isPending={downloadingId === row.id}
                  >
                    Download CSV
                  </LoadingButton>
                )}
                {canManage && row.status !== "ACKNOWLEDGED" && row.status !== "RECONCILED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleAckOpen(row)}
                  >
                    Record ack
                  </Button>
                )}
              </div>
            </div>
          )}
          emptyState={
            <EmptyState
              illustration={<EmptyApprovalIllustration />}
              title="No filings prepared"
              description="Prepare a statutory filing export from a payroll month to track submission and acknowledgement."
              action={
                canManage
                  ? { label: "Prepare filing export", onClick: () => setShowExport(true) }
                  : undefined
              }
            />
          }
        />
      )}

      <FilingExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        supportedTypes={supportedTypes}
        typeLabels={FILING_TYPE_LABEL}
        indiaEntities={indiaEntities}
        honestyLabel={honestyLabel}
        ruleBundle={ruleBundle}
        currentFy={getCurrentFY()}
        defaultMonth={getDefaultMonth()}
      />

      <Dialog open={ackTarget !== null} onOpenChange={(open) => !open && setAckTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record acknowledgement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-xs text-muted-foreground">
              {ackTarget ? FILING_TYPE_LABEL[ackTarget.filingType] : ""} — enter the portal
              challan and/or acknowledgement reference to mark this filing acknowledged.
            </p>
            <div className="space-y-1.5">
              <label className="block text-label font-medium text-foreground">
                Challan reference
              </label>
              <Input
                value={challanRef}
                onChange={(e) => setChallanRef(e.target.value)}
                placeholder="e.g. CIN / CRN"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-label font-medium text-foreground">
                Acknowledgement reference
              </label>
              <Input
                value={ackRef}
                onChange={(e) => setAckRef(e.target.value)}
                placeholder="e.g. token / receipt number"
                maxLength={120}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAckTarget(null)}>
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              onClick={handleAckConfirm}
              isPending={ackMutation.isPending}
              loadingText="Saving…"
            >
              Record acknowledgement
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

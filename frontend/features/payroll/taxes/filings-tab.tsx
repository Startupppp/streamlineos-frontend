"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import {
  usePayrollFilings,
  useFilingCapabilities,
  usePrepareFilingExport,
  useAttachAcknowledgement,
  downloadFilingExport,
  type PayrollFiling,
  type FilingType,
  type FilingStatus,
} from "@/hooks/api/payroll/filings";

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
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  SUBMITTED:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  ACKNOWLEDGED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  RECONCILED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  FAILED:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
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
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function FilingsTab() {
  const canManage = useCan("payroll:tax:manage");
  const { data, isLoading } = usePayrollFilings();
  const { data: capability } = useFilingCapabilities();
  const prepareMutation = usePrepareFilingExport();
  const ackMutation = useAttachAcknowledgement();

  const honestyLabel = capability?.honestyLabel ?? FALLBACK_HONESTY_LABEL;
  const capabilityNote = capability?.note ?? FALLBACK_CAPABILITY_NOTE;
  const supportedTypes = capability?.supportedTypes ?? FILING_TYPE_OPTIONS;
  const ruleBundle = capability?.ruleBundleVersion;

  const [showExport, setShowExport] = useState(false);
  const [exportType, setExportType] = useState<FilingType>("PF_ECR");
  const [exportMonth, setExportMonth] = useState(getDefaultMonth);
  const [ackTarget, setAckTarget] = useState<PayrollFiling | null>(null);
  const [challanRef, setChallanRef] = useState("");
  const [ackRef, setAckRef] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  function handleExportConfirm() {
    prepareMutation.mutate(
      {
        filingType: exportType,
        fiscalYear: getCurrentFY(),
        month: exportMonth,
      },
      {
        onSuccess: (row) => {
          const summary = row.exportSummary;
          const rowNote =
            summary != null
              ? `${summary.rowCount} employee row(s) from ${summary.periodMonth ?? exportMonth} (rule ${summary.ruleBundleVersion}).`
              : "Submit the export on the statutory portal, then record the acknowledgement here.";
          toast.success(honestyLabel, { description: rowNote });
          setShowExport(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
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
        <span className="text-[13px] font-medium text-foreground">
          {FILING_TYPE_LABEL[row.filingType]}
        </span>
      ),
    },
    {
      key: "fiscalYear",
      header: "Period / FY",
      cell: (row: PayrollFiling) => (
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {row.fiscalYear ?? "—"}
          {row.ruleVersion ? (
            <span className="ml-1 text-[10px] opacity-80">· {row.ruleVersion}</span>
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
            <span className="text-[11px] text-muted-foreground">{row.statusLabel}</span>
          )}
        </div>
      ),
    },
    {
      key: "ref",
      header: "Challan / Ack. ref",
      cell: (row: PayrollFiling) => (
        <span className="text-[12px] text-muted-foreground tabular-nums">
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleDownload(row)}
              disabled={downloadingId === row.id}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              {downloadingId === row.id ? "…" : "CSV"}
            </Button>
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
        className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-[12px] font-medium text-amber-900 dark:text-amber-100">
            {honestyLabel}
            {ruleBundle ? (
              <span className="ml-1.5 font-normal text-amber-800/80 dark:text-amber-200/70">
                · rule {ruleBundle}
              </span>
            ) : null}
          </p>
          <p className="text-[11px] leading-snug text-amber-800/90 dark:text-amber-200/80">
            {capabilityNote}
            {capability && !capability.automaticFiling && !capability.automaticRemittance
              ? " Automatic filing and remittance are not available."
              : null}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-muted-foreground">
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

      <DataTable
        className="flex-1 min-h-0"
        data={data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        minWidth="720px"
        mobileCard={(row) => (
          <div className="flex flex-col gap-1.5 px-1 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">
                {FILING_TYPE_LABEL[row.filingType]}
              </span>
              <StatusBadge status={row.status} />
            </div>
            {row.statusLabel && (
              <span className="text-[11px] text-muted-foreground">{row.statusLabel}</span>
            )}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>{row.fiscalYear ?? "—"}</span>
              <span>{row.acknowledgementRef ?? row.challanRef ?? "No ref"}</span>
            </div>
            <div className="mt-1 flex gap-1.5">
              {row.status !== "DRAFT" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => void handleDownload(row)}
                  disabled={downloadingId === row.id}
                >
                  Download CSV
                </Button>
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

      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prepare filing export</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground">
                Filing type
              </label>
              <Select value={exportType} onValueChange={(v) => setExportType(v as FilingType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {FILING_TYPE_LABEL[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground">
                Payroll month
              </label>
              <MonthPicker value={exportMonth} onChange={setExportMonth} className="w-full" />
              <p className="text-[11px] text-muted-foreground">
                Uses the REGULAR run for this month when present. Empty CSV if no run/lines
                match.
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Financial year {getCurrentFY()}
              {ruleBundle ? ` · rule ${ruleBundle}` : ""}. {honestyLabel}.
              {exportType === "FORM16"
                ? " Form 16 full certificate is not generated — period summary only."
                : ""}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowExport(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExportConfirm} disabled={prepareMutation.isPending}>
              {prepareMutation.isPending ? "Preparing…" : "Prepare export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ackTarget !== null} onOpenChange={(open) => !open && setAckTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record acknowledgement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-[12px] text-muted-foreground">
              {ackTarget ? FILING_TYPE_LABEL[ackTarget.filingType] : ""} — enter the portal
              challan and/or acknowledgement reference to mark this filing acknowledged.
            </p>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground">
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
              <label className="block text-[13px] font-medium text-foreground">
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
            <Button size="sm" onClick={handleAckConfirm} disabled={ackMutation.isPending}>
              {ackMutation.isPending ? "Saving…" : "Record acknowledgement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

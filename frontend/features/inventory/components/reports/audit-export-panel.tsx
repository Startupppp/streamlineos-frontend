"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDateTime } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useCanState } from "@/hooks/api/access";
import {
  downloadAuditExport,
  useAuditExportJobs,
  useCreateAuditExportJob,
  useVerifyAuditExport,
  type AuditExportJob,
} from "@/hooks/api/inventory/audit-export";

/**
 * Taking the ledger away, with a checksum that proves it did not change.
 *
 * All five routes were unreachable, so `inventory:audit:export` — a key that
 * exists precisely because taking evidence away is a stronger right than reading
 * the trail — governed nothing a person could do.
 */
export function AuditExportPanel() {
  const canExportState = useCanState("inventory:audit:export");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [verifying, setVerifying] = useState<number | null>(null);

  const { data, isPending, isError, error, refetch } = useAuditExportJobs({ limit: 20 });
  const create = useCreateAuditExportJob();
  const verification = useVerifyAuditExport(verifying, verifying !== null);

  if (canExportState === "denied") return null;

  function handleCreate(): void {
    create.mutate(
      { ...(from === "" ? {} : { from }), ...(to === "" ? {} : { to }) },
      {
        onSuccess: () => toast.success("Export requested. It settles in the background."),
        onError: (createError) => toast.error(getErrorMessage(createError)),
      },
    );
  }

  function handleDownload(job: AuditExportJob): void {
    void downloadAuditExport(job.id).catch((downloadError: unknown) => {
      toast.error(getErrorMessage(downloadError));
    });
  }

  const columns: DataTableColumn<AuditExportJob>[] = [
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-dense font-medium",
            statusToneClasses(
              row.status === "COMPLETED" ? "success" : row.status === "FAILED" ? "danger" : "info",
            ),
          )}
        >
          {row.status === "COMPLETED"
            ? "Ready"
            : row.status === "FAILED"
              ? (row.failureReason ?? "Failed")
              : "Settling"}
        </span>
      ),
    },
    {
      key: "window",
      header: "Window",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {row.filterFrom ?? "Everything"}
          {row.filterTo === null ? "" : ` – ${row.filterTo}`}
        </span>
      ),
    },
    {
      key: "evidenceVersion",
      header: "Evidence version",
      cell: (row) => <span className="font-mono text-dense">{row.evidenceVersion}</span>,
    },
    {
      key: "rows",
      header: "Rows",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => (row.ledgerRowCount ?? 0) + (row.auditRowCount ?? 0),
    },
    {
      key: "checksum",
      header: "Checksum",
      cell: (row) => (
        <span className="font-mono text-dense text-muted-foreground">
          {row.checksum === null ? "—" : `${row.checksum.slice(0, 12)}…`}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Requested",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-44",
      className: "w-44",
      cell: (row) =>
        row.status === "COMPLETED" ? (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7" onClick={() => handleDownload(row)}>
              <Download className="mr-1 h-3 w-3" aria-hidden="true" />
              Download
            </Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setVerifying(row.id)}>
              <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
              Verify
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <div>
          <CardTitle className="text-sm font-semibold">Evidence export</CardTitle>
          <p className="text-dense text-muted-foreground">
            A checksummed copy of the ledger for the window you choose. The bundle is not stored —
            it is regenerated from a pinned evidence version, so verifying re-streams it and
            compares.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-dense text-muted-foreground">From</span>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-dense text-muted-foreground">To</span>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <LoadingButton
            isPending={create.isPending}
            loadingText="Requesting…"
            onClick={handleCreate}
          >
            Request export
          </LoadingButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        {isError ? (
          <ErrorState
            title="Couldn't load export jobs"
            description={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : (
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isPending}
            minWidth="900px"
            emptyState={
              <InventoryEmptyState
                illustrationPreset="documents"
                title="No evidence has been exported"
                description="Request one to take a checksummed copy of the ledger away for an audit."
                compact
              />
            }
          />
        )}

        {verifying !== null ? (
          <div className="px-4 pb-4">
            {verification.isError ? (
              <ErrorState
                title="Couldn't verify the bundle"
                description={getErrorMessage(verification.error)}
                onRetry={() => void verification.refetch()}
              />
            ) : verification.isLoading ? (
              <p className="text-dense text-muted-foreground">Re-streaming the bundle…</p>
            ) : verification.data ? (
              <p
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  statusToneClasses(verification.data.match ? "success" : "danger"),
                )}
              >
                {verification.data.match
                  ? `Verified — ${String(verification.data.actualByteLength)} bytes still hash to the recorded checksum.`
                  : "This bundle no longer reproduces its recorded checksum. Do not rely on a copy taken from it."}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePayrollRuns } from "@/hooks/api/payroll";
import { useRunPublications, usePublishPayslips, downloadPayslipPdf } from "@/hooks/api/payroll";
import type { PayslipPublication, PublicationStatus } from "@/types/payroll";
import type { PayrollRunStatus } from "@/types/payroll/runs";
import { formatMonth } from "@/features/payroll/shared";

const PUBLISHABLE_STATUSES: PayrollRunStatus[] = ["LOCKED", "PAID", "PAYSLIPS_PUBLISHED", "CLOSED"];

const STATUS_CLASSES: Record<PublicationStatus, string> = {
  PENDING: "bg-muted text-muted-foreground border border-border",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  FAILED: "bg-red-50 text-red-700 border border-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

function PublishDialog({
  open,
  onOpenChange,
  runId,
  month,
  employeeCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: number;
  month: string;
  employeeCount: number | null;
}) {
  const publishMutation = usePublishPayslips();

  function handleConfirm() {
    publishMutation.mutate(
      { runId },
      {
        onSuccess: (data) => {
          toast.success(`Published ${data.published}/${data.total} payslips`);
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish Payslips</DialogTitle>
          <DialogDescription>
            Publish all{employeeCount != null ? ` ${employeeCount}` : ""} employees&apos; payslips
            for {formatMonth(month)}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={publishMutation.isPending}>
            {publishMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PublicationsTabProps {
  canManage: boolean;
}

export function PublicationsTab({ canManage }: PublicationsTabProps) {
  const { data: runsData, isLoading: runsLoading } = usePayrollRuns({ limit: 50 });
  const [publishOpen, setPublishOpen] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());

  const eligibleRuns = useMemo(
    () => (runsData?.data ?? []).filter((r) => PUBLISHABLE_STATUSES.includes(r.status)),
    [runsData],
  );

  const defaultRunId = useMemo(() => {
    const paid = eligibleRuns.find((r) => r.status === "PAID" || r.status === "PAYSLIPS_PUBLISHED");
    return paid?.id ?? eligibleRuns[0]?.id ?? 0;
  }, [eligibleRuns]);

  const [selectedRunId, setSelectedRunId] = useState<number>(0);

  const activeRunId = selectedRunId !== 0 ? selectedRunId : defaultRunId;
  const selectedRun = eligibleRuns.find((r) => r.id === activeRunId);

  const { data: publications, isLoading: pubsLoading } = useRunPublications(activeRunId);

  function handleRunChange(value: string) {
    setSelectedRunId(Number(value));
  }

  async function handleDownload(publicationId: number) {
    setDownloadingIds((prev) => new Set([...prev, publicationId]));
    try {
      await downloadPayslipPdf(publicationId);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(publicationId);
        return next;
      });
    }
  }

  function handleOpenPublish() {
    setPublishOpen(true);
  }

  const columns = useMemo<DataTableColumn<PayslipPublication>[]>(
    () => [
      {
        key: "userId",
        header: "Employee",
        cell: (row) => <span className="font-mono text-[11px]">{row.userId}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase",
              STATUS_CLASSES[row.status],
            )}
          >
            {row.status === "PUBLISHED" && <CheckCircle2 className="h-3 w-3" />}
            {row.status}
          </span>
        ),
      },
      {
        key: "channel",
        header: "Channel",
        cell: (row) => <span className="text-[11px]">{row.channel}</span>,
      },
      {
        key: "publishedAt",
        header: "Published At",
        cell: (row) => (
          <span className="text-[11px] text-muted-foreground">
            {row.publishedAt
              ? new Date(row.publishedAt).toLocaleDateString()
              : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        cell: (row) => {
          const isDownloading = downloadingIds.has(row.id);
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px] gap-1"
              disabled={isDownloading || !row.pdfUrl}
              onClick={() => handleDownload(row.id)}
            >
              {isDownloading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              PDF
            </Button>
          );
        },
      },
    ],
    [downloadingIds],
  );

  const canPublish = canManage && selectedRun?.status === "PAID";

  return (
    <div className="flex flex-1 min-h-0 flex-col space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select
          value={String(activeRunId || "")}
          onValueChange={handleRunChange}
          disabled={runsLoading || eligibleRuns.length === 0}
        >
          <SelectTrigger className="w-64 h-8 text-xs">
            <SelectValue placeholder="Select a payroll run" />
          </SelectTrigger>
          <SelectContent>
            {eligibleRuns.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {formatMonth(r.month)} — {r.status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canPublish && (
          <Button size="sm" className="gap-1.5" onClick={handleOpenPublish}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Publish Payslips
          </Button>
        )}
      </div>

      {activeRunId > 0 && (
        <DataTable
          className="flex-1 min-h-0"
          data={publications ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={pubsLoading}
          emptyState={
            <EmptyState
              illustration={<EmptyTransferIllustration />}
              title="No payslips published yet"
              description="Publish payslips to make them available to employees."
            />
          }
        />
      )}

      {activeRunId === 0 && !runsLoading && (
        <EmptyState
          title="No eligible runs"
          description="Lock a payroll run to publish payslips."
        />
      )}

      {selectedRun && (
        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          runId={selectedRun.id}
          month={selectedRun.month}
          employeeCount={selectedRun.employeeCount}
        />
      )}
    </div>
  );
}

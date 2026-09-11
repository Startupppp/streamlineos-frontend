"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { FiBanknoteIcon, FiCheckIcon, FiClockIcon, FiLayersIcon } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { PaymentRunStatus } from "@/hooks/api/accounting/ap";
import {
  usePaymentRun,
  useApprovePaymentRun,
  useExecutePaymentRun,
  useCancelPaymentRun,
} from "@/hooks/api/accounting/ap";
import { formatShortDate } from "@/lib/date-utils";
import { buildPaymentRunItemColumns } from "@/features/accounting/purchases/payment-run-item-columns";

interface PaymentRunDetailPageProps {
  params: Promise<{ runId: string }>;
}

function RunStatusBadge({ status }: { status: PaymentRunStatus }) {
  const classes: Record<PaymentRunStatus, string> = {
    DRAFT: "bg-primary/5 text-foreground border-primary/20",
    APPROVED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    COMPLETED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    CANCELLED: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<PaymentRunStatus, string> = {
    DRAFT: "Draft",
    APPROVED: "Approved",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return (
    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${classes[status]}`}>
      {labels[status]}
    </Badge>
  );
}

export default function PaymentRunDetailPage({
  params,
}: PaymentRunDetailPageProps) {
  const { runId } = use(params);
  const id = Number(runId);

  const query = usePaymentRun(id);
  const canApprove = useCan("accounting:payment-runs:approve");
  const canManage = useCan("accounting:payment-runs:manage");

  const approveMutation = useApprovePaymentRun(id);
  const executeMutation = useExecutePaymentRun(id);
  const cancelMutation = useCancelPaymentRun(id);

  const [executeConfirmOpen, setExecuteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const run = query.data;
  const items = run?.items ?? [];
  const isDraft = run?.status === "DRAFT";

  function handleApprove(): void {
    approveMutation.mutate(undefined, {
      onSuccess: () => toast.success("Payment run approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleOpenExecuteConfirm(): void {
    setExecuteConfirmOpen(true);
  }

  function handleOpenCancelConfirm(): void {
    setCancelConfirmOpen(true);
  }

  function handleExecuteConfirm(): void {
    executeMutation.mutate(undefined, {
      onSuccess: () => {
        setExecuteConfirmOpen(false);
        toast.success("Payment run executed");
      },
      onError: (err) => {
        setExecuteConfirmOpen(false);
        toast.error(getErrorMessage(err));
      },
    });
  }

  function handleCancelConfirm(): void {
    cancelMutation.mutate(undefined, {
      onSuccess: () => {
        setCancelConfirmOpen(false);
        toast.success("Payment run cancelled");
      },
      onError: (err) => {
        setCancelConfirmOpen(false);
        toast.error(getErrorMessage(err));
      },
    });
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const columns = buildPaymentRunItemColumns(id, isDraft);

  const paidCount = items.filter((i) => i.status === "PAID").length;
  const skippedCount = items.filter((i) => i.status === "SKIPPED").length;

  return (
    <PageWrapper
      title={run?.name ?? "Payment Run"}
      subtitle={
        run
          ? `${run.status} · ${formatShortDate(run.scheduledDate) || "—"}`
          : "Loading…"
      }
      backHref="/accounting/payment-runs"
      actions={
        run ? (
          <div className="flex items-center gap-2">
            <RunStatusBadge status={run.status} />
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {query.isLoading && <LoadingState variant="table" rows={12} />}
        {query.error && (
          <ErrorState
            title="Failed to load payment run"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        )}

        {run && (
          <>
            <StatCardGrid cols={4}>
              <StatCard
                label="Total"
                value={Number(run.totalAmount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                icon={FiBanknoteIcon}
                tone="blue"
                isLoading={query.isLoading}
              />
              <StatCard
                label="Items"
                value={items.length}
                icon={FiLayersIcon}
                tone="default"
                isLoading={query.isLoading}
              />
              <StatCard
                label="Paid"
                value={paidCount}
                icon={FiCheckIcon}
                tone="emerald"
                isLoading={query.isLoading}
              />
              <StatCard
                label="Skipped"
                value={skippedCount}
                icon={FiClockIcon}
                tone="amber"
                isLoading={query.isLoading}
              />
            </StatCardGrid>

            {(run.status === "DRAFT" || run.status === "APPROVED") && (
              <div className="flex items-center gap-2">
                {run.status === "DRAFT" && canApprove && (
                  <LoadingButton
                    size="sm"
                    isPending={approveMutation.isPending}
                    onClick={handleApprove}
                  >
                    Approve
                  </LoadingButton>
                )}
                {run.status === "APPROVED" && canManage && (
                  <LoadingButton
                    size="sm"
                    isPending={executeMutation.isPending}
                    onClick={handleOpenExecuteConfirm}
                  >
                    Execute
                  </LoadingButton>
                )}
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCancelConfirm}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel run
                  </Button>
                )}
              </div>
            )}

            <DataTable
              className="flex-1 min-h-0"
              data={items}
              columns={columns}
              getRowKey={(item) => item.id}
              isLoading={query.isLoading}
              emptyState={
                <EmptyState compact title="No items in this payment run" description="Add vendor bills to this run to process payments." />
              }
            />
          </>
        )}
      </div>

      <AlertDialog open={executeConfirmOpen} onOpenChange={setExecuteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute payment run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create vendor payments for all pending items and mark
              the run as completed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecuteConfirm}>
              {executeMutation.isPending ? "Executing…" : "Execute"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel payment run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the payment run. No payments will be processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep run</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>
              {cancelMutation.isPending ? "Cancelling…" : "Cancel run"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

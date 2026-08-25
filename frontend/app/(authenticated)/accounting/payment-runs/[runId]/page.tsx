"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { Money, FiBanknoteIcon, FiCheckIcon, FiClockIcon, FiLayersIcon } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { PaymentRunItem, PaymentRunStatus, PaymentRunItemStatus } from "@/hooks/api/accounting/ap";
import {
  usePaymentRun,
  useApprovePaymentRun,
  useExecutePaymentRun,
  useCancelPaymentRun,
  useUpdatePaymentRunItem,
} from "@/hooks/api/accounting/ap";

interface PaymentRunDetailPageProps {
  params: Promise<{ runId: string }>;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
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

function ItemStatusBadge({ status }: { status: PaymentRunItemStatus }) {
  const classes: Record<PaymentRunItemStatus, string> = {
    PENDING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    PAID: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    SKIPPED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  };
  return (
    <Badge variant="outline" className={`text-micro px-1.5 py-0 h-4 ${classes[status]}`}>
      {status}
    </Badge>
  );
}

function ItemAmountCell({
  item,
  runId,
  isDraft,
}: {
  item: PaymentRunItem;
  runId: number;
  isDraft: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editValue, setEditValue] = useState(
    String(Number(item.amount).toFixed(2)),
  );
  const updateMutation = useUpdatePaymentRunItem(runId, item.id);

  function handleSave(): void {
    const amount = Number(editValue);
    if (!Number.isFinite(amount) || amount <= 0) return;
    updateMutation.mutate(
      { amount },
      {
        onSuccess: () => {
          setPopoverOpen(false);
          toast.success("Amount updated");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleExclude(): void {
    updateMutation.mutate(
      { excluded: true },
      {
        onSuccess: () => {
          setPopoverOpen(false);
          toast.success("Item excluded");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleEditValueChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setEditValue(e.target.value);
  }

  if (!isDraft) return <Money value={Number(item.amount)} />;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono h-7 px-2 hover:bg-muted"
        >
          <Money value={Number(item.amount)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3 space-y-2">
        <Input
          value={editValue}
          onChange={handleEditValueChange}
          className="text-sm"
          type="number"
          step="0.01"
          min="0.01"
        />
        <div className="flex gap-2">
          <LoadingButton
            size="sm"
            className="flex-1"
            isPending={updateMutation.isPending}
            onClick={handleSave}
          >
            Save
          </LoadingButton>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExclude}
            disabled={updateMutation.isPending}
          >
            Exclude
          </Button>
        </div>
      </PopoverContent>
    </Popover>
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

  const columns: DataTableColumn<PaymentRunItem>[] = [
    {
      key: "vendor",
      header: "Vendor",
      cell: (item) => (
        <span className="text-sm">{item.vendorName ?? "—"}</span>
      ),
    },
    {
      key: "bill",
      header: "Bill #",
      cell: (item) => (
        <Link
          href={`/accounting/purchase-bills/${item.billId}`}
          className="font-mono text-xs text-foreground hover:text-primary hover:underline"
        >
          {item.billNumber ?? "—"}
        </Link>
      ),
    },
    {
      key: "dueDate",
      header: "Due date",
      cell: (item) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(item.dueDate)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (item) => (
        <ItemAmountCell item={item} runId={id} isDraft={isDraft} />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <ItemStatusBadge status={item.status} />,
    },
  ];

  const paidCount = items.filter((i) => i.status === "PAID").length;
  const skippedCount = items.filter((i) => i.status === "SKIPPED").length;

  return (
    <PageWrapper
      title={run?.name ?? "Payment Run"}
      subtitle={
        run
          ? `${run.status} · ${formatDate(run.scheduledDate)}`
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

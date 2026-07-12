"use client";

import { useState, useCallback, use } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useReimbursementBatch, useApproveBatch } from "@/hooks/api/accounting/expenses";
import { PayBatchDialog } from "@/features/accounting/expenses/pay-batch-dialog";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReimbursementBatchStatus } from "@/types/accounting/expenses";
import type { FinanceStatus } from "@/features/accounting/shared";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_MAP: Record<ReimbursementBatchStatus, FinanceStatus> = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  PAID: "PAID",
};

interface BatchDetailPageProps {
  params: Promise<{ batchId: string }>;
}

export default function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { batchId: batchIdStr } = use(params);
  const batchId = parseInt(batchIdStr, 10);

  const [payOpen, setPayOpen] = useState(false);

  const canApprove = useCan("accounting:reimbursements:approve");
  const canManage = useCan("accounting:reimbursements:manage");

  const query = useReimbursementBatch(batchId);
  const approveMutation = useApproveBatch(batchId);

  function handleRetry(): void {
    void query.refetch();
  }

  const handleApprove = useCallback(() => {
    approveMutation.mutate(undefined, {
      onSuccess: () => toast.success("Batch approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [approveMutation]);

  const handleOpenPay = useCallback(() => setPayOpen(true), []);

  function handlePaid(): void {
    void query.refetch();
  }

  if (query.isLoading) {
    return (
      <PageWrapper eyebrow="Accounting · Reimbursements" title="Loading..." backHref="/accounting/expenses/reimbursements">
        <LoadingState variant="table" rows={6} />
      </PageWrapper>
    );
  }

  if (query.error) {
    return (
      <PageWrapper eyebrow="Accounting · Reimbursements" title="Error" backHref="/accounting/expenses/reimbursements">
        <ErrorState
          title="Failed to load batch"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!query.data) return null;

  const { batch, items } = query.data;

  const showApprove = canApprove && batch.status === "DRAFT";
  const showPay = canManage && batch.status === "APPROVED";

  return (
    <PageWrapper
      eyebrow="Accounting · Reimbursements"
      title={batch.name}
      subtitle={`Created by ${getUserDisplayName(batch.creator)} · ${formatDate(batch.createdAt)}`}
      backHref="/accounting/expenses/reimbursements"
      badge={<FinanceStatusBadge status={STATUS_MAP[batch.status]} size="chip" />}
      actions={
        <>
          {showApprove && (
            <LoadingButton
              size="sm"
              isPending={approveMutation.isPending}
              onClick={handleApprove}
            >
              Approve batch
            </LoadingButton>
          )}
          {showPay && (
            <LoadingButton size="sm" isPending={false} onClick={handleOpenPay}>
              Pay batch
            </LoadingButton>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Total</p>
            <Money value={parseFloat(batch.totalAmount)} className="text-lg font-semibold" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Items</p>
            <p className="text-lg font-semibold">{items.length}</p>
          </div>
          {batch.approvedAt && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Approved by</p>
              <p className="text-sm">
                {getUserDisplayName(batch.approver)} · {formatDate(batch.approvedAt)}
              </p>
            </div>
          )}
          {batch.paidDate && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Paid date</p>
              <p className="text-sm">{formatDate(batch.paidDate)}</p>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No items in this batch"
            compact
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Employee
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Category
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                      <TableCell className="px-3 py-2">
                        <p className="text-sm font-medium">{item.userName ?? item.userEmail ?? "—"}</p>
                        {item.userEmail && item.userName && (
                          <p className="text-xs text-muted-foreground">{item.userEmail}</p>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                        {item.category}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-muted-foreground hidden md:table-cell">
                        {formatDate(item.expenseDate)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        <Money value={parseFloat(item.amount)} className="text-sm font-medium" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <PayBatchDialog
        batchId={batchId}
        batchName={batch.name}
        open={payOpen}
        onOpenChange={setPayOpen}
        onPaid={handlePaid}
      />
    </PageWrapper>
  );
}

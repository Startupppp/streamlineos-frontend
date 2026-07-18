"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { AppSheet } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { useApproveExpense, useRejectExpense } from "@/hooks/api/accounting/expenses";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import type { ExpenseStatus } from "@/features/accounting/shared";
import { parseExpenseReceipts } from "@/features/hr/expenses/expense-constants";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface ExpenseDetailSheetProps {
  expense: ExpenseWithExtras | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPENSE_STATUS_VALUES: ReadonlyArray<string> = ["DRAFT", "SUBMITTED", "APPROVED", "REIMBURSEMENT_PENDING", "REIMBURSED", "REJECTED"];

function isExpenseStatus(s: string): s is ExpenseStatus {
  return EXPENSE_STATUS_VALUES.includes(s);
}

type ExpenseWithExtras = ExpenseWithRelations & { policyFlag?: string; taxAmount?: string; receiptNumber?: string };

export function ExpenseDetailSheet({ expense, open, onOpenChange }: ExpenseDetailSheetProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canManage = useCan("accounting:reimbursements:manage");
  const approveMutation = useApproveExpense(expense?.id ?? 0);
  const rejectMutation = useRejectExpense(expense?.id ?? 0);

  const handleApprove = useCallback(() => {
    if (!expense) return;
    approveMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Expense approved");
        onOpenChange(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [expense, approveMutation, onOpenChange]);

  const handleRejectSubmit = useCallback(() => {
    if (!expense) return;
    rejectMutation.mutate(
      { rejectionReason: rejectReason.trim() || "No reason provided" },
      {
        onSuccess: () => {
          toast.success("Expense rejected");
          setRejectMode(false);
          setRejectReason("");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [expense, rejectMutation, rejectReason, onOpenChange]);

  const handleEnterRejectMode = useCallback(() => setRejectMode(true), []);

  const handleCancelReject = useCallback(() => {
    setRejectMode(false);
    setRejectReason("");
  }, []);

  const handleRejectReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value),
    [],
  );

  if (!expense) return null;

  const isSubmitted = expense.status === "SUBMITTED";
  const showActions = canManage && isSubmitted;
  const policyFlag = expense.policyFlag;
  const receipts = parseExpenseReceipts(expense.receiptUrl, expense.receiptFileName);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Expense Detail"
      description={expense.merchant ?? expense.category}
      footer={
        showActions ? (
          rejectMode ? (
            <div className="flex flex-col gap-2 w-full">
              <Label className="text-xs text-muted-foreground">Rejection reason</Label>
              <Textarea
                value={rejectReason}
                onChange={handleRejectReasonChange}
                rows={2}
                className="text-sm resize-none"
                placeholder="Optional reason for rejection"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCancelReject}>
                  Cancel
                </Button>
                <LoadingButton
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  isPending={rejectMutation.isPending}
                  onClick={handleRejectSubmit}
                >
                  Confirm reject
                </LoadingButton>
              </div>
            </div>
          ) : (
            <>
              <LoadingButton
                variant="default"
                className="flex-1"
                isPending={approveMutation.isPending}
                onClick={handleApprove}
              >
                Approve
              </LoadingButton>
              <Button variant="outline" className="flex-1" onClick={handleEnterRejectMode}>
                Reject
              </Button>
            </>
          )
        ) : undefined
      }
    >
      <div className="space-y-4">
        {policyFlag && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {policyFlag === "OVER_LIMIT" ? "Exceeds policy limit" : "Receipt required per policy"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Employee</p>
            <p className="text-sm font-medium">{getUserDisplayName(expense.user)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Status</p>
            {expense.status && isExpenseStatus(expense.status) && (
              <FinanceStatusBadge status={expense.status} size="chip" />
            )}
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Date</p>
            <p className="text-sm">{formatDate(expense.expenseDate)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Amount</p>
            <Money value={parseFloat(expense.amount)} className="text-sm font-semibold" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Category</p>
            <p className="text-sm">{expense.category}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Merchant</p>
            <p className="text-sm">{expense.merchant ?? "—"}</p>
          </div>
          {expense.taxAmount !== undefined && expense.taxAmount !== null && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Tax</p>
              <Money value={parseFloat(expense.taxAmount)} className="text-sm" />
            </div>
          )}
          {expense.description && (
            <div className="col-span-2">
              <p className="text-[11px] text-muted-foreground mb-0.5">Description</p>
              <p className="text-sm text-muted-foreground">{expense.description}</p>
            </div>
          )}
        </div>

        {receipts.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">
                Receipt{receipts.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-col gap-1">
                {receipts.map((receipt) => (
                  <a
                    key={receipt.url}
                    href={receipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {receipt.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}

        {expense.approvedAt && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-[11px] text-muted-foreground mb-0.5">Approved by</p>
            <p className="text-sm">{getUserDisplayName(expense.approver)} · {formatDate(String(expense.approvedAt))}</p>
          </div>
        )}

        {expense.rejectionReason && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-[11px] text-muted-foreground mb-0.5">Rejection reason</p>
            <p className="text-sm text-red-600">{expense.rejectionReason}</p>
          </div>
        )}
      </div>
    </AppSheet>
  );
}

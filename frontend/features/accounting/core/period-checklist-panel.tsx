"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { LoadingState } from "@/components/shared";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import {
  useClosePeriod,
  useLockPeriod,
  useReopenPeriod,
} from "@/hooks/api/accounting/core";
import type { AccountingPeriod, PeriodChecklist } from "@/hooks/api/accounting/core";

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

interface ChecklistItemProps {
  label: string;
  passed: boolean;
  count: number;
  href?: string;
}

export function ChecklistItem({ label, passed, count, href }: ChecklistItemProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
        )}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {!passed && count > 0 && (
          <span className="text-xs text-red-600 font-medium tabular-nums">{count} pending</span>
        )}
        {href && !passed && (
          <Link href={href} className="text-xs text-primary hover:underline">
            View
          </Link>
        )}
      </div>
    </div>
  );
}

export interface PeriodChecklistPanelProps {
  period: AccountingPeriod;
  checklist: PeriodChecklist | undefined;
  isLoading: boolean;
  canManage: boolean;
  canReopen: boolean;
}

export function PeriodChecklistPanel({
  period,
  checklist,
  isLoading,
  canManage,
  canReopen,
}: PeriodChecklistPanelProps) {
  const [closeOpen, setCloseOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  const closeMutation = useClosePeriod(period.id);
  const lockMutation = useLockPeriod(period.id);
  const reopenMutation = useReopenPeriod(period.id);

  function handleCloseClick(): void {
    setCloseOpen(true);
  }

  function handleCloseConfirm(): void {
    closeMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Period closed");
        setCloseOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setCloseOpen(false);
      },
    });
  }

  function handleLockClick(): void {
    setLockOpen(true);
  }

  function handleLockConfirm(): void {
    lockMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Period locked");
        setLockOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setLockOpen(false);
      },
    });
  }

  function handleReopenClick(): void {
    setReopenOpen(true);
  }

  function handleReopenConfirm(): void {
    reopenMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Period reopened");
        setReopenOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setReopenOpen(false);
      },
    });
  }

  const canClose = checklist?.canClose ?? false;
  const isOpen = period.status === "OPEN" || period.status === "CLOSING";
  const isClosed = period.status === "CLOSED";
  const isLocked = period.status === "LOCKED";

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="px-4 pt-4 pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{period.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(period.startDate)} — {formatDate(period.endDate)}
            </p>
          </div>
          <FinanceStatusBadge status={period.status} size="chip" />
        </div>
      </CardHeader>
      <CardContent className="px-4 py-3">
        {isLoading ? (
          <LoadingState variant="form" rows={4} />
        ) : checklist ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Close checklist
            </p>
            <ChecklistItem
              label="No draft journals"
              passed={checklist.checklist.noDraftJournals.passed}
              count={checklist.checklist.noDraftJournals.count}
              href="/accounting/journal?status=DRAFT"
            />
            <ChecklistItem
              label="No draft bills"
              passed={checklist.checklist.noDraftBills.passed}
              count={checklist.checklist.noDraftBills.count}
              href="/accounting/purchase-bills?status=DRAFT"
            />
            <ChecklistItem
              label="No unreconciled transactions"
              passed={checklist.checklist.noUnreconciledTransactions.passed}
              count={checklist.checklist.noUnreconciledTransactions.count}
              href="/accounting/banking"
            />
            <ChecklistItem
              label="No pending approvals"
              passed={checklist.checklist.noPendingApprovals.passed}
              count={checklist.checklist.noPendingApprovals.count}
              href="/accounting/journal?status=PENDING_APPROVAL"
            />
          </div>
        ) : null}

        {(isOpen || isClosed || isLocked) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
            {isOpen && canManage && (
              <LoadingButton
                size="sm"
                isPending={closeMutation.isPending}
                loadingText="Closing…"
                variant={canClose ? "default" : "outline"}
                onClick={handleCloseClick}
              >
                Close period
              </LoadingButton>
            )}
            {isClosed && canManage && (
              <LoadingButton
                size="sm"
                isPending={lockMutation.isPending}
                loadingText="Locking…"
                onClick={handleLockClick}
              >
                Lock period
              </LoadingButton>
            )}
            {(isClosed || isLocked) && canReopen && (
              <LoadingButton
                size="sm"
                variant="outline"
                isPending={reopenMutation.isPending}
                loadingText="Reopening…"
                onClick={handleReopenClick}
              >
                Reopen period
              </LoadingButton>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close period?</AlertDialogTitle>
            <AlertDialogDescription>
              {canClose
                ? "This will close the period. No new transactions can be posted to closed periods."
                : "Some checklist items are not complete. Closing anyway will force-close the period."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseConfirm} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? "Closing…" : canClose ? "Close period" : "Close anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={lockOpen} onOpenChange={setLockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock period?</AlertDialogTitle>
            <AlertDialogDescription>
              Locking a period prevents any further changes. This action can only be undone by a user with reopen permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lockMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLockConfirm} disabled={lockMutation.isPending}>
              {lockMutation.isPending ? "Locking…" : "Lock period"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen period?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reopen the period and allow new transactions to be posted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reopenMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopenConfirm} disabled={reopenMutation.isPending}>
              {reopenMutation.isPending ? "Reopening…" : "Reopen period"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

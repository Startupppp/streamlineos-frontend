"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { LoadingState, ErrorState } from "@/components/shared";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import {
  usePeriods,
  useGeneratePeriods,
  usePeriodChecklist,
  useClosePeriod,
  useLockPeriod,
  useReopenPeriod,
} from "@/hooks/api/accounting/core";
import { useCan } from "@/hooks/api/access";
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

function ChecklistItem({ label, passed, count, href }: ChecklistItemProps) {
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
          <Link href={href} className="text-xs text-blue-600 hover:underline">
            View
          </Link>
        )}
      </div>
    </div>
  );
}

interface PeriodChecklistPanelProps {
  period: AccountingPeriod;
  checklist: PeriodChecklist | undefined;
  isLoading: boolean;
  canManage: boolean;
  canReopen: boolean;
}

function PeriodChecklistPanel({
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
              <Button
                size="sm"
                onClick={handleCloseClick}
                disabled={closeMutation.isPending}
                variant={canClose ? "default" : "outline"}
              >
                {closeMutation.isPending ? "Closing…" : "Close period"}
              </Button>
            )}
            {isClosed && canManage && (
              <Button
                size="sm"
                onClick={handleLockClick}
                disabled={lockMutation.isPending}
              >
                {lockMutation.isPending ? "Locking…" : "Lock period"}
              </Button>
            )}
            {(isClosed || isLocked) && canReopen && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReopenClick}
                disabled={reopenMutation.isPending}
              >
                {reopenMutation.isPending ? "Reopening…" : "Reopen period"}
              </Button>
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

interface GeneratePeriodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GeneratePeriodsDialog({ open, onOpenChange }: GeneratePeriodsDialogProps) {
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const mutation = useGeneratePeriods();

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setYear(e.target.value);
  }

  function handleGenerate(): void {
    const yearNum = parseInt(year, 10);
    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
      toast.error("Enter a valid year");
      return;
    }
    mutation.mutate(
      { year: yearNum },
      {
        onSuccess: (result) => {
          toast.success(`${result.created} periods created for ${yearNum}`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleClose(isOpen: boolean): void {
    onOpenChange(isOpen);
  }

  function handleCancelClick(): void {
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Generate fiscal periods</DialogTitle>
          <DialogDescription>
            Create monthly periods for the selected year.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label htmlFor="gen-year" className="text-xs font-medium text-muted-foreground block mb-1.5">
            Year
          </label>
          <Input
            id="gen-year"
            type="number"
            value={year}
            onChange={handleYearChange}
            min={2000}
            max={2100}
            placeholder="e.g. 2025"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancelClick} disabled={mutation.isPending}>
            Cancel
          </Button>
          <LoadingButton isPending={mutation.isPending} loadingText="Generating…" onClick={handleGenerate}>
            Generate
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PeriodClosePage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const canManage = useCan("accounting:periods:manage");
  const canReopen = useCan("accounting:periods:reopen");

  const periodsQuery = usePeriods();
  const periods = periodsQuery.data ?? [];

  const checklistQuery = usePeriodChecklist(selectedPeriodId ?? 0, selectedPeriodId !== null);
  const selectedPeriod = periods.find((p: AccountingPeriod) => p.id === selectedPeriodId);

  function handlePeriodSelect(id: number): void {
    setSelectedPeriodId(id === selectedPeriodId ? null : id);
  }

  function handleRetry(): void {
    void periodsQuery.refetch();
  }

  function handleOpenGenerate(): void {
    setGenerateOpen(true);
  }

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Period Close"
      subtitle="Manage fiscal periods and close checklists."
      actions={
        canManage ? (
          <Button size="sm" onClick={handleOpenGenerate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Generate periods
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-1 space-y-2">
          {periodsQuery.isLoading ? (
            <LoadingState variant="table" rows={6} />
          ) : periodsQuery.error ? (
            <ErrorState
              title="Failed to load periods"
              description={periodsQuery.error.message}
              onRetry={handleRetry}
            />
          ) : periods.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 px-4 text-center">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600 mb-3">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No periods yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">Generate fiscal periods to get started.</p>
              {canManage && (
                <Button size="sm" className="mt-3" onClick={handleOpenGenerate}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Generate periods
                </Button>
              )}
            </div>
          ) : (
            periods.map((period: AccountingPeriod) => (
              <button
                key={period.id}
                type="button"
                onClick={() => handlePeriodSelect(period.id)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                  selectedPeriodId === period.id
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{period.name}</span>
                  <FinanceStatusBadge status={period.status} size="row" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(period.startDate)} — {formatDate(period.endDate)}
                </p>
                {period.closedBy && period.closedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Closed by {period.closedBy}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <PeriodChecklistPanel
              period={selectedPeriod}
              checklist={checklistQuery.data}
              isLoading={checklistQuery.isLoading}
              canManage={canManage}
              canReopen={canReopen}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-16 px-6 text-center h-full min-h-[300px]">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 mb-3">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No period selected</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Select a period from the list to view its close checklist.
              </p>
            </div>
          )}
        </div>
      </div>

      <GeneratePeriodsDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </PageWrapper>
  );
}

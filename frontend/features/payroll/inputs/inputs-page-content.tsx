"use client";

import { useState } from "react";
import { AlertCircle, Lock, LockOpen, RefreshCw, Calendar } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { ErrorState } from "@/components/shared";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMonth } from "@/features/payroll/shared/payroll-format";
import { formatShortDate } from "@/lib/date-utils";
import { PeriodStatusChip } from "@/features/payroll/inputs/period-status-chip";
import { InputsSectionTabs } from "@/features/payroll/inputs/inputs-section-tabs";
import { CreateAdjustmentDialog } from "@/features/payroll/inputs/create-adjustment-dialog";
import {
  usePayrollInputPeriods,
  useCreatePayrollInputPeriod,
  useBuildPayrollInputPeriod,
  useLockPayrollInputPeriod,
  useUnlockPayrollInputPeriod,
} from "@/hooks/api/payroll/payroll-inputs";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}


export function InputsPageContent() {
  const [month, setMonth] = useState(currentYearMonth);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [adjDialogOpen, setAdjDialogOpen] = useState(false);

  const {
    data: periodsData,
    isLoading,
    error,
    refetch,
  } = usePayrollInputPeriods({ limit: 100 });
  const createPeriod = useCreatePayrollInputPeriod();
  const buildPeriod = useBuildPayrollInputPeriod();
  const lockPeriod = useLockPayrollInputPeriod();
  const unlockPeriod = useUnlockPayrollInputPeriod();

  const periods = periodsData?.data ?? [];
  const currentPeriod = periods.find((p) => p.periodKey === month);

  const isLocked = currentPeriod?.status === "locked";
  const isBuilt = currentPeriod?.status === "built" || isLocked;
  const isBuilding = currentPeriod?.status === "building";

  if (error) {
    return (
      <PageWrapper title="Payroll Inputs">
        <ErrorState
          title="Failed to load payroll input periods"
          description="Could not load data. Please try again."
          onRetry={refetch}
        />
      </PageWrapper>
    );
  }

  function handleCreatePeriod() {
    createPeriod.mutate({ periodKey: month });
    setShowCreateConfirm(false);
  }

  function handleBuild() {
    if (!currentPeriod) return;
    buildPeriod.mutate(currentPeriod.id);
  }

  function handleLock() {
    if (!currentPeriod) return;
    lockPeriod.mutate(currentPeriod.id);
    setShowLockConfirm(false);
  }

  function handleUnlock() {
    if (!currentPeriod) return;
    unlockPeriod.mutate(currentPeriod.id);
    setShowUnlockConfirm(false);
  }

  const actions = (
    <div className="flex items-center gap-2">
      {!currentPeriod && !isLoading && (
        <LoadingButton
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() => setShowCreateConfirm(true)}
          isPending={createPeriod.isPending}
          loadingText="Opening…"
        >
          <Calendar className="h-3.5 w-3.5" />
          Open Period
        </LoadingButton>
      )}
      {currentPeriod && currentPeriod.status !== "locked" && (
        <LoadingButton
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          isPending={buildPeriod.isPending || isBuilding}
          loadingText="Building..."
          onClick={handleBuild}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {currentPeriod.status === "open" ? "Build Inputs" : "Rebuild"}
        </LoadingButton>
      )}
      {currentPeriod?.status === "built" && (
        <LoadingButton
          size="sm"
          className="text-xs gap-1"
          isPending={lockPeriod.isPending}
          onClick={() => setShowLockConfirm(true)}
        >
          <Lock className="h-3.5 w-3.5" />
          Lock Period
        </LoadingButton>
      )}
      {isLocked && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1 text-status-warning-ink border-status-warning-rule hover:bg-status-warning-surface"
          onClick={() => setShowUnlockConfirm(true)}
        >
          <LockOpen className="h-3.5 w-3.5" />
          Unlock
        </Button>
      )}
    </div>
  );

  return (
    <PageWrapper
      title="Payroll Inputs"
      subtitle="Capture and lock HR data for payroll processing"
      actions={actions}
      filters={
        <MonthPicker
          value={month}
          onChange={setMonth}
          yearRange={[-1, 0]}
          className="w-44"
        />
      }
    >
      {isLoading && (
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="flex gap-3">
            <Skeleton className="h-4 w-24" />{" "}
            <Skeleton className="h-4 w-32" />{" "}
          </div>
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {currentPeriod ? (
            <>
              <div className="flex items-center gap-3 text-sm">
                <PeriodStatusChip status={currentPeriod.status} />
                {currentPeriod.cutoffDate && (
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Cutoff: {currentPeriod.cutoffDate}
                  </span>
                )}
                {currentPeriod.builtAt && (
                  <span className="text-muted-foreground text-xs">
                    Built {formatShortDate(currentPeriod.builtAt)}
                  </span>
                )}
                {currentPeriod.lockedAt && (
                  <span className="text-muted-foreground text-xs">
                    Locked {formatShortDate(currentPeriod.lockedAt)}
                  </span>
                )}
              </div>

              {!isBuilt && currentPeriod.status !== "building" && (
                <div className="border border-dashed border-border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Period is open. Click <strong>Build Inputs</strong> to
                    snapshot attendance, leave, overtime, reimbursements, and
                    deductions for {formatMonth(month)}.
                  </p>
                </div>
              )}

              {isBuilding && (
                <div className="border border-status-warning-rule bg-status-warning-surface rounded-lg p-3 text-sm text-status-warning-ink">
                  Building snapshots — this may take a moment...
                </div>
              )}

              {isBuilt && (
                <InputsSectionTabs
                  periodId={currentPeriod.id}
                  isLocked={isLocked}
                  onCreateAdjustment={() => setAdjDialogOpen(true)}
                />
              )}
            </>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No input period found for{" "}
                <strong>{formatMonth(month)}</strong>.
              </p>
              <LoadingButton
                variant="outline"
                size="sm"
                onClick={() => setShowCreateConfirm(true)}
                isPending={createPeriod.isPending}
                loadingText="Opening…"
              >
                Open Period
              </LoadingButton>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open payroll input period?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an input period for{" "}
              <strong>{formatMonth(month)}</strong>. You can then build
              and lock HR data for payroll.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createPeriod.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton onClick={handleCreatePeriod} isPending={createPeriod.isPending} loadingText="Opening…">
                Open Period
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock this period?</AlertDialogTitle>
            <AlertDialogDescription>
              Locking <strong>{formatMonth(month)}</strong> will prevent
              further changes. Leave ledger entries for this period will be
              marked as locked. Any subsequent HR changes will create
              adjustments for the next cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lockPeriod.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton onClick={handleLock} isPending={lockPeriod.isPending} loadingText="Locking…">
                Lock Period
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnlockConfirm} onOpenChange={setShowUnlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock this period?</AlertDialogTitle>
            <AlertDialogDescription>
              Unlocking will allow changes to be made to{" "}
              <strong>{formatMonth(month)}</strong>. This action is
              audited. Payroll processing that has already consumed this period
              may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlockPeriod.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                onClick={handleUnlock}
                isPending={unlockPeriod.isPending}
                loadingText="Unlocking…"
                className="bg-status-warning-fill text-white hover:bg-status-warning-fill-hover"
              >
                Unlock Period
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {currentPeriod && (
        <CreateAdjustmentDialog
          open={adjDialogOpen}
          onOpenChange={setAdjDialogOpen}
          periodId={currentPeriod.id}
        />
      )}
    </PageWrapper>
  );
}

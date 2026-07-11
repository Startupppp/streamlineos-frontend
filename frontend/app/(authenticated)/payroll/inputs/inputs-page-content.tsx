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

function formatPeriodLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function InputsPageContent() {
  const [month, setMonth] = useState(currentYearMonth);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [adjDialogOpen, setAdjDialogOpen] = useState(false);

  const { data: periodsData, isLoading, error, refetch } = usePayrollInputPeriods({ limit: 100 });
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
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setShowCreateConfirm(true)}
        >
          <Calendar className="h-3.5 w-3.5" />
          Open Period
        </Button>
      )}
      {currentPeriod && currentPeriod.status !== "locked" && (
        <LoadingButton
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
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
          className="h-8 text-xs gap-1"
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
          className="h-8 text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
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
        <MonthPicker value={month} onChange={setMonth} yearRange={[-1, 0]} className="w-44" />
      }
    >
      {isLoading && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
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
                    Built {new Date(currentPeriod.builtAt).toLocaleDateString("en-IN")}
                  </span>
                )}
                {currentPeriod.lockedAt && (
                  <span className="text-muted-foreground text-xs">
                    Locked {new Date(currentPeriod.lockedAt).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>

              {!isBuilt && currentPeriod.status !== "building" && (
                <div className="border border-dashed border-border rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Period is open. Click <strong>Build Inputs</strong> to snapshot attendance, leave, overtime, reimbursements, and deductions for {formatPeriodLabel(month)}.
                  </p>
                </div>
              )}

              {isBuilding && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-700">
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
            <div className="border border-dashed border-border rounded-lg p-10 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No input period found for <strong>{formatPeriodLabel(month)}</strong>.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateConfirm(true)}
                disabled={createPeriod.isPending}
              >
                Open Period
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open payroll input period?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an input period for <strong>{formatPeriodLabel(month)}</strong>. You can then build and lock HR data for payroll.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreatePeriod}>Open Period</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock this period?</AlertDialogTitle>
            <AlertDialogDescription>
              Locking <strong>{formatPeriodLabel(month)}</strong> will prevent further changes. Leave ledger entries for this period will be marked as locked. Any subsequent HR changes will create adjustments for the next cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLock} className="bg-primary text-primary-foreground">
              Lock Period
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnlockConfirm} onOpenChange={setShowUnlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock this period?</AlertDialogTitle>
            <AlertDialogDescription>
              Unlocking will allow changes to be made to <strong>{formatPeriodLabel(month)}</strong>. This action is audited. Payroll processing that has already consumed this period may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlock} className="bg-amber-600 text-white hover:bg-amber-700">
              Unlock Period
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

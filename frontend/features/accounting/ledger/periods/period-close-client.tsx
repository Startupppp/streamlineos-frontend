"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import {
  useAccountingPeriods,
  useFiscalYears,
  useLockPeriod,
  useOpenNextFiscalYear,
  useUnlockPeriod,
} from "@/hooks/api/accounting/ledger";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { AccountingPeriod } from "@/types/accounting-kernel";

const MIN_REASON_LENGTH = 3;

export function PeriodCloseClient() {
  const canRead = useCan("accounting:periods:read");
  const canManage = useCan("accounting:periods:manage");
  const canReopen = useCan("accounting:periods:reopen");

  const [locking, setLocking] = useState<AccountingPeriod | null>(null);
  const [unlocking, setUnlocking] = useState<AccountingPeriod | null>(null);

  const fiscalYears = useFiscalYears();
  const periods = useAccountingPeriods();
  const lockPeriod = useLockPeriod();
  const unlockPeriod = useUnlockPeriod();
  const openNextYear = useOpenNextFiscalYear();

  const yearNameById = useMemo(
    () => new Map((fiscalYears.data ?? []).map((year) => [year.id, year.name])),
    [fiscalYears.data],
  );

  function handleLock() {
    if (!locking) return;
    lockPeriod.mutate(
      { periodId: locking.id },
      {
        onSuccess: () => {
          toast.success(`${locking.name} is locked. Nothing new can be posted into it.`);
          setLocking(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleUnlock(reason: string) {
    if (!unlocking) return;
    if (reason.trim().length < MIN_REASON_LENGTH) {
      toast.error("Say why this period is being reopened — at least a few words.");
      return;
    }
    unlockPeriod.mutate(
      { periodId: unlocking.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`${unlocking.name} is open again. The reason has been recorded.`);
          setUnlocking(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleOpenNextYear() {
    openNextYear.mutate(undefined, {
      onSuccess: (year) => toast.success(`${year.name} is open, with its periods created.`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const columns: DataTableColumn<AccountingPeriod>[] = [
    {
      key: "name",
      header: "Period",
      cell: (row) => <span className="truncate font-medium">{row.name}</span>,
    },
    {
      key: "year",
      header: "Financial year",
      cell: (row) => (
        <span className="text-muted-foreground">
          {yearNameById.get(row.fiscalYearId) ?? "Unknown year"}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Covers",
      className: "whitespace-nowrap font-mono text-dense tabular-nums",
      cell: (row) => `${formatShortDate(row.startsOn)} – ${formatShortDate(row.endsOn)}`,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const tone = statusToneClasses(row.status === "LOCKED" ? "neutral" : "success");
        return (
          <Badge
            variant="outline"
            className={cn("h-5 px-2 py-0.5 text-micro", tone.surface, tone.ink, tone.rule)}
          >
            {row.status === "LOCKED" ? "Closed" : "Open"}
          </Badge>
        );
      },
    },
    {
      key: "reason",
      header: "Why it was closed",
      cell: (row) => (
        <span className="truncate text-muted-foreground">{row.lockReason ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      headerClassName: "text-right",
      cell: (row) =>
        row.status === "OPEN" ? (
          canManage ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-dense"
              onClick={() => setLocking(row)}
            >
              Close
            </Button>
          ) : null
        ) : canReopen ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-dense"
            onClick={() => setUnlocking(row)}
          >
            Reopen
          </Button>
        ) : null,
    },
  ];

  return (
    <PageWrapper
      title="Financial years and periods"
      subtitle="Closing a period freezes it. Reopening one is recorded with a reason."
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      noInternalScroll
      actions={
        canManage ? (
          <LoadingButton
            size="sm"
            variant="outline"
            isPending={openNextYear.isPending}
            onClick={handleOpenNextYear}
            className="flex-1 sm:flex-none"
          >
            Open the next financial year
          </LoadingButton>
        ) : undefined
      }
    >
      {!canRead ? (
        <NoPermissionState permission="accounting:periods:read" />
      ) : periods.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load your periods"
          description={getErrorMessage(periods.error)}
          onRetry={periods.refetch}
        />
      ) : (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <DataTable
              data={periods.data ?? []}
              columns={columns}
              getRowKey={(row) => row.id}
              isLoading={periods.isLoading}
              className="min-h-0 flex-1"
              minWidth="900px"
              pagination={{ pageSize: 50 }}
              emptyState={
                <EmptyState
                  className="min-h-[40vh] flex-1 border-0 bg-transparent"
                  title="No periods yet"
                  description="Turning accounting on opens your first financial year and creates its periods."
                  action={{ label: "Set up accounting", href: "/accounting/setup" }}
                />
              }
            />
          </CardContent>
        </Card>
      )}

      {locking ? (
        <ConfirmDialog
          open
          onOpenChange={() => setLocking(null)}
          title={`Close ${locking.name}?`}
          description="Nothing can be posted into a closed period. Invoices, bills and journals dated inside it will be refused until it is reopened."
          confirmLabel="Close the period"
          isPending={lockPeriod.isPending}
          keepOpenOnConfirm
          onConfirm={handleLock}
        />
      ) : null}

      {unlocking ? (
        <ConfirmWithReasonSheet
          open
          onOpenChange={() => setUnlocking(null)}
          title={`Reopen ${unlocking.name}?`}
          description="Reopening a closed period lets figures that have already been reported change. The reason you give is stored against the period."
          reasonLabel="Why is this period being reopened?"
          reasonPlaceholder="A supplier bill arrived after we closed the month"
          reasonRequired
          confirmLabel="Reopen the period"
          isPending={unlockPeriod.isPending}
          onConfirm={handleUnlock}
        />
      ) : null}
    </PageWrapper>
  );
}

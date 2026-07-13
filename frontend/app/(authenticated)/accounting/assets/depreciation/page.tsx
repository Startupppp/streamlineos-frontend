"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { EmptyReportIllustration } from "@/components/illustrations";
import { Money } from "@/features/accounting/shared";
import { useCan } from "@/hooks/api/access";
import {
  useDepreciationRuns,
  useCreateDepreciationRun,
  useReverseDepreciationRun,
} from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type { DepreciationRun } from "@/types/accounting/assets";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

const runDepreciationSchema = z.object({
  periodKey: z
    .string()
    .min(1, "Period is required")
    .regex(PERIOD_PATTERN, "Must be in YYYY-MM format (e.g. 2025-01)"),
});

type RunFormValues = z.infer<typeof runDepreciationSchema>;

const RUN_STATUS_CLASSES: Record<DepreciationRun["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  REVERSED: "bg-muted text-foreground border-border",
};

const RUN_STATUS_LABELS: Record<DepreciationRun["status"], string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  REVERSED: "Reversed",
};

function RunStatusBadge({ status }: { status: DepreciationRun["status"] }) {
  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${RUN_STATUS_CLASSES[status]}`}>
      {RUN_STATUS_LABELS[status]}
    </Badge>
  );
}

interface ReverseRowProps {
  run: DepreciationRun;
  canManage: boolean;
}

function ReverseRow({ run, canManage }: ReverseRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reverseMutation = useReverseDepreciationRun(run.id);

  function handleOpenConfirm(): void {
    setConfirmOpen(true);
  }

  function handleReverseConfirm(): void {
    reverseMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(`Run for ${run.periodKey} reversed`);
        setConfirmOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDialogChange(open: boolean): void {
    if (!reverseMutation.isPending) setConfirmOpen(open);
  }

  const canReverse = canManage && run.status === "COMPLETED";

  return (
    <>
      {canReverse && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleOpenConfirm}
        >
          <RotateCcw className="h-3 w-3" />
          Reverse
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={handleDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse depreciation run for {run.periodKey}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the journal entry and mark this run as reversed. This affects{" "}
              {run.assetCount} asset{run.assetCount !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverseMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReverseConfirm}
              disabled={reverseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reverseMutation.isPending ? "Reversing…" : "Reverse run"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function DepreciationRunsPage() {
  const canManage = useCan("accounting:assets:manage");
  const [createOpen, setCreateOpen] = useState(false);

  const runsQuery = useDepreciationRuns({ pageSize: 100 });
  const runs = runsQuery.data?.items ?? [];

  const createRunMutation = useCreateDepreciationRun();

  const depreciationRunColumns: DataTableColumn<DepreciationRun>[] = [
    {
      key: "periodKey",
      header: "Period",
      cell: (run) => (
        <span className="font-mono text-xs font-medium">{run.periodKey}</span>
      ),
    },
    {
      key: "assetCount",
      header: "Assets",
      className: "text-right tabular-nums",
      headerClassName: "text-right",
      cell: (run) => run.assetCount,
    },
    {
      key: "totalDepreciation",
      header: "Total Depr.",
      className: "text-right",
      headerClassName: "text-right",
      cell: (run) => <Money value={parseFloat(run.totalDepreciation)} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (run) => <RunStatusBadge status={run.status} />,
    },
    {
      key: "journalEntryId",
      header: "Journal",
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (run) =>
        run.journalEntryId ? (
          <Link
            href={`/accounting/journal/${run.journalEntryId}`}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            JE-{run.journalEntryId}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "postedBy",
      header: "Posted By",
      className: "hidden lg:table-cell text-muted-foreground",
      headerClassName: "hidden lg:table-cell",
      cell: (run) => run.postedBy ?? "—",
    },
    {
      key: "postedAt",
      header: "Posted At",
      className: "hidden lg:table-cell text-muted-foreground",
      headerClassName: "hidden lg:table-cell",
      cell: (run) => formatDate(run.postedAt),
    },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      cell: (run) => <ReverseRow run={run} canManage={canManage} />,
    },
  ];

  function handleRetry(): void {
    void runsQuery.refetch();
  }

  function handleCreateRun(values: RunFormValues): void {
    createRunMutation.mutate(
      { periodKey: values.periodKey },
      {
        onSuccess: () => {
          toast.success(`Depreciation run created for ${values.periodKey}`);
          setCreateOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <>
      <PageWrapper
        eyebrow="Fixed Assets"
        title="Depreciation Runs"
        subtitle="View and manage monthly depreciation postings"
        actions={
          canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Play className="size-4 mr-1" />
              Run Depreciation
            </Button>
          )
        }
      >
        {runsQuery.error && (
          <ErrorState
            title="Failed to load depreciation runs"
            description={getErrorMessage(runsQuery.error)}
            onRetry={handleRetry}
          />
        )}

        {!runsQuery.error && (
          <DataTable
            data={runs}
            columns={depreciationRunColumns}
            getRowKey={(row) => row.id}
            isLoading={runsQuery.isLoading}
            emptyState={
              <EmptyState
                illustration={<EmptyReportIllustration />}
                title="No depreciation runs yet"
                description="Run depreciation for a period to post entries for all active assets."
                action={
                  canManage
                    ? { label: "Run Depreciation", onClick: () => setCreateOpen(true) }
                    : undefined
                }
              />
            }
            minWidth="640px"
          />
        )}
      </PageWrapper>

      <EntityFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Run Depreciation"
        description="Create depreciation entries for all active assets in the selected period."
        resolver={zodResolver(runDepreciationSchema)}
        defaultValues={{ periodKey: "" }}
        onSubmit={handleCreateRun}
        isSubmitting={createRunMutation.isPending}
        submitLabel="Run Depreciation"
        resetOnOpen
      >
        {(form) => (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="run-period">Period</Label>
              <Input
                id="run-period"
                {...form.register("periodKey")}
                placeholder="2025-01"
                className="font-mono"
              />
              {form.formState.errors.periodKey && (
                <p className="text-xs text-destructive">{form.formState.errors.periodKey.message}</p>
              )}
            </div>
            <div className="rounded-md bg-blue-50/70 border border-blue-100 px-3 py-2.5 text-xs text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300">
              This will create depreciation journal entries for all active assets in the specified period.
              Ensure the period has not been run previously.
            </div>
          </>
        )}
      </EntityFormDialog>
    </>
  );
}

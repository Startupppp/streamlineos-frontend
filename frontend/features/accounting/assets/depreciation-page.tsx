"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { EmptyReportIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";
import {
  useDepreciationRuns,
  useCreateDepreciationRun,
} from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type { DepreciationRun } from "@/types/accounting/assets";
import type { RunFormValues } from "./depreciation-schema";
import { depreciationRunColumns } from "./depreciation-run-columns";
import { RunDepreciationDialog } from "./run-depreciation-dialog";

export function DepreciationPage() {
  const canManage = useCan("accounting:assets:manage");
  const [createOpen, setCreateOpen] = useState(false);

  const runsQuery = useDepreciationRuns({ limit: 100 });
  const runs = runsQuery.data?.data ?? [];

  const createRunMutation = useCreateDepreciationRun();

  const columns = depreciationRunColumns(canManage);

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }

  function handleRetry(): void {
    void runsQuery.refetch();
  }

  function handleGetRunKey(row: DepreciationRun): number {
    return row.id;
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
        title="Depreciation Runs"
        subtitle="View and manage monthly depreciation postings"
        actions={
          canManage && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Play className="size-4 mr-1" />
              Run Depreciation
            </Button>
          )
        }
      >
        <div className="flex flex-1 min-h-0 flex-col">
          {runsQuery.error && (
            <ErrorState
              title="Failed to load depreciation runs"
              description={getErrorMessage(runsQuery.error)}
              onRetry={handleRetry}
            />
          )}

          {!runsQuery.error && (
            <DataTable
              className="flex-1 min-h-0"
              data={runs}
              columns={columns}
              getRowKey={handleGetRunKey}
              isLoading={runsQuery.isLoading}
              emptyState={
                <EmptyState
                  illustration={<EmptyReportIllustration />}
                  title="No depreciation runs yet"
                  description="Run depreciation for a period to post entries for all active assets."
                  action={
                    canManage
                      ? { label: "Run Depreciation", onClick: handleOpenCreate }
                      : undefined
                  }
                />
              }
              minWidth="640px"
            />
          )}
        </div>
      </PageWrapper>

      <RunDepreciationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateRun}
        isSubmitting={createRunMutation.isPending}
      />
    </>
  );
}

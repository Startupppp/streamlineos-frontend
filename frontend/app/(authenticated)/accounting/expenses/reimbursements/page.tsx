"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useReimbursementBatches } from "@/hooks/api/accounting/expenses";
import { ReimbursementTable } from "@/features/accounting/expenses/reimbursement-table";
import { CreateBatchSheet } from "@/features/accounting/expenses/create-batch-sheet";

export default function ReimbursementsPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = useCan("accounting:reimbursements:manage");
  const query = useReimbursementBatches({ page, pageSize: 25 });

  const batches = query.data?.data ?? [];
  const pagination = query.data;

  function handleRetry(): void {
    void query.refetch();
  }

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  return (
    <PageWrapper
      title="Reimbursement Batches"
      subtitle="Group and process employee reimbursements."
      actions={
        canManage ? (
          <LoadingButton size="sm" onClick={handleOpenCreate} isPending={false}>
            <Plus className="size-4 mr-1" />
            New batch
          </LoadingButton>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {query.isLoading && <LoadingState variant="table" rows={12} />}

        {query.error && (
          <ErrorState
            title="Failed to load batches"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        )}

        {!query.isLoading && !query.error && (
          <ReimbursementTable
            data={batches}
            isLoading={false}
            page={pagination?.page ?? 1}
            pageSize={pagination?.pageSize ?? 25}
            total={pagination?.total ?? 0}
            onPageChange={setPage}
            className="flex-1 min-h-0"
            emptyState={
              <EmptyState
                illustration={<EmptyExpensesIllustration />}
                title="No reimbursement batches yet"
                description="Create a batch to group and pay approved employee expenses."
                action={canManage ? { label: "New batch", onClick: handleOpenCreate } : undefined}
              />
            }
          />
        )}
      </div>

      <CreateBatchSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}

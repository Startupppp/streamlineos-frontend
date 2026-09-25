"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useReimbursements,
  useProcessReimbursement,
  type Reimbursement,
} from "@/hooks/api/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { LoadingState } from "@/components/shared/loading-state";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { usePageState } from "@/hooks/api/use-page-state";
import { buildReimbursementColumns } from "./reimbursement-columns";
import { ReimbursementRequestSheet } from "./reimbursement-request-sheet";

export function ReimbursementsPage() {
  const { data: session } = useSession();
  const { data: items, isLoading, isError, error, refetch } = useReimbursements();
  const process = useProcessReimbursement();
  // PATCH /hr/reimbursements/:id re-checks hr:expenses:approve in-handler.
  const isAdmin = useCan("hr:expenses:approve");
  const money = useOrgDisplay();
  const pageState = usePageState({ permission: "hr:payroll:view", module: "payroll", isLoading, isError, error });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);

  const handleRejectDialogOpenChange = useCallback((open: boolean) => { if (!open) setRejectId(null); }, []);
  const handleOpenNewRequest = useCallback(() => setSheetOpen(true), []);

  const handleApprove = useCallback(
    (id: number) => {
      process.mutate(
        { reimbursementId: id, status: "APPROVED" },
        {
          onSuccess: () => toast.success("Approved"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [process],
  );

  const handleReject = useCallback(() => {
    if (!rejectId) return;
    process.mutate(
      { reimbursementId: rejectId, status: "REJECTED" },
      {
        onSuccess: () => {
          toast.success("Rejected");
          setRejectId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [rejectId, process]);

  function handleRetry() { void refetch(); }

  const reimbursementColumns = buildReimbursementColumns({
    currentUserId: session?.user?.id,
    isAdmin,
    isProcessing: process.isPending,
    processingId: process.variables?.reimbursementId ?? null,
    money,
    onApprove: handleApprove,
    onStartReject: setRejectId,
  });

  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Submit and track expense reimbursements"
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenNewRequest}>
          <Plus className="h-3.5 w-3.5" />
          Create reimbursement request
        </Button>
      }
    >
      <PageState resolution={pageState} loading={<LoadingState variant="table" />} onRetry={handleRetry} className="flex-1">
        <DataTable<Reimbursement>
          data={items ?? []}
          columns={reimbursementColumns}
          getRowKey={(r) => r.id}
          className="flex-1 min-h-0"
          emptyState={
            <EmptyState
              illustrationPreset="expenses"
              title="No reimbursement requests"
              description="Submit expense reimbursement requests for approval."
            />
          }
        />
      </PageState>

      <ReimbursementRequestSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <ConfirmSheet
        open={rejectId !== null}
        onOpenChange={handleRejectDialogOpenChange}
        title="Reject Reimbursement"
        description="Are you sure you want to reject this reimbursement request?"
        confirmLabel="Reject"
        destructive
        onConfirm={handleReject}
        isPending={process.isPending}
      />
    </PageWrapper>
  );
}

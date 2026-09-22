"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useRef, type ChangeEvent } from "react";
import {
  useReimbursements,
  useCreateReimbursement,
  useProcessReimbursement,
  type Reimbursement,
} from "@/hooks/api/hr";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/components/shared/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Receipt, CheckCircle2, XCircle, Upload, FileText, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  MAX_RECEIPT_BYTES,
  isValidOtherLabel,
} from "./reimbursement-status";
import { buildReimbursementColumns } from "./reimbursement-columns";
import { ReimbursementRequestSheet } from "./reimbursement-request-sheet";


export function ReimbursementsPage() {
  const { data: session } = useSession();
  const { data: items, isLoading, isError, refetch } = useReimbursements();
  const create = useCreateReimbursement();
  const process = useProcessReimbursement();
  const uploadFile = useUploadFile();
  const isAdmin = useCan("hr:expenses:approve");

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

  if (isError) {
    return (
      <PageWrapper title="Reimbursements" subtitle="Submit and track expense reimbursements">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Failed to load reimbursements</p>
            <p className="text-xs text-muted-foreground mt-1">Something went wrong. Please try again.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>Try Again</Button>
        </div>
      </PageWrapper>
    );
  }

  const reimbursementColumns = buildReimbursementColumns({
    currentUserId: session?.user?.id,
    isAdmin,
    isProcessing: process.isPending,
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
      <DataTable<Reimbursement>
        data={items ?? []}
        columns={reimbursementColumns}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        className="flex-1 min-h-0"
        emptyState={
          <EmptyState
            illustrationPreset="expenses"
            title="No reimbursement requests"
            description="Submit expense reimbursement requests for approval."
          />
        }
      />

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

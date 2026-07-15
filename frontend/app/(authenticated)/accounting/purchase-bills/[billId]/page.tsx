"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CreditCard, Send } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState, ErrorState } from "@/components/shared";
import { usePurchaseBill, usePostPurchaseBill } from "@/hooks/api/accounting";
import {
  useBillSubmitApproval,
  useBillApprove,
  useBillCancel,
} from "@/hooks/api/accounting/ap";
import { useCan } from "@/hooks/api/access";
import { RecordVendorPaymentDialog } from "@/features/accounting/record-vendor-payment-dialog";
import { BillDetailView } from "@/features/accounting/purchases/bill-detail-view";
import { getErrorMessage } from "@/lib/get-error-message";

interface PurchaseBillDetailPageProps {
  params: Promise<{ billId: string }>;
}

export default function PurchaseBillDetailPage({
  params,
}: PurchaseBillDetailPageProps) {
  const { billId } = use(params);
  const id = Number(billId);

  const query = usePurchaseBill(id);
  const postMutation = usePostPurchaseBill(id);
  const submitApprovalMutation = useBillSubmitApproval(id);
  const approveMutation = useBillApprove(id);
  const cancelMutation = useBillCancel(id);

  const canApprove = useCan("accounting:payables:approve");
  const canManage = useCan("accounting:payables:manage");

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const bill = query.data;

  const canPost = bill?.status === "DRAFT";
  const canSubmitApproval = bill?.status === "DRAFT" && canManage;
  const isPendingApproval = bill?.status === "PENDING_APPROVAL";
  const amountPaid = Number(bill?.amountPaid ?? 0);
  const total = Number(bill?.total ?? 0);
  const outstanding = total - amountPaid;
  const canRecordPayment =
    (bill?.status === "POSTED" || bill?.status === "PARTIALLY_PAID") &&
    outstanding > 0.005;

  const handleOpenPostDialog = useCallback(() => {
    setPostDialogOpen(true);
  }, []);

  const handlePostDialogChange = useCallback(
    (open: boolean) => {
      if (postMutation.isPending) return;
      setPostDialogOpen(open);
    },
    [postMutation.isPending],
  );

  const handlePostConfirm = useCallback(() => {
    postMutation.mutate(undefined, {
      onSuccess: () => {
        setPostDialogOpen(false);
        toast.success(`Bill ${bill?.billNumber ?? ""} posted`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [postMutation, bill?.billNumber]);

  const handleSubmitApproval = useCallback(() => {
    submitApprovalMutation.mutate(
      {},
      {
        onSuccess: () => toast.success("Submitted for approval"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [submitApprovalMutation]);

  const handleApprove = useCallback(() => {
    approveMutation.mutate(undefined, {
      onSuccess: () => toast.success(`Bill ${bill?.billNumber ?? ""} approved`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [approveMutation, bill?.billNumber]);

  const handleOpenCancelDialog = useCallback(() => {
    setCancelDialogOpen(true);
  }, []);

  const handleCancelDialogChange = useCallback(
    (open: boolean) => {
      if (!cancelMutation.isPending) setCancelDialogOpen(open);
    },
    [cancelMutation.isPending],
  );

  const handleCancelConfirm = useCallback(() => {
    cancelMutation.mutate(
      {},
      {
        onSuccess: () => {
          setCancelDialogOpen(false);
          toast.success("Bill cancelled");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [cancelMutation]);

  const handleOpenPaymentDialog = useCallback(() => {
    setPaymentDialogOpen(true);
  }, []);

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      title={bill?.billNumber ?? "Purchase bill"}
      subtitle={
        bill
          ? `${bill.vendorName ?? "Unknown vendor"} · ${bill.billDate ? new Date(bill.billDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }) : "—"}`
          : "Loading…"
      }
      actions={
        <div className="flex items-center gap-2">
          {canSubmitApproval && (
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={submitApprovalMutation.isPending}
              loadingText="Submitting…"
              onClick={handleSubmitApproval}
            >
              <Send className="mr-1 h-4 w-4" />
              Submit for approval
            </LoadingButton>
          )}
          {canPost && (
            <Button
              size="sm"
              onClick={handleOpenPostDialog}
              disabled={postMutation.isPending}
            >
              <Send className="mr-1 h-4 w-4" />
              Post bill
            </Button>
          )}
          {canRecordPayment && (
            <Button size="sm" variant="outline" onClick={handleOpenPaymentDialog}>
              <CreditCard className="mr-1 h-4 w-4" />
              Record payment
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/accounting/purchase-bills">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {query.isLoading ? (
          <LoadingState variant="page" />
        ) : query.error ? (
          <ErrorState
            title="Failed to load bill"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : !bill ? (
          <ErrorState
            title="Bill not found"
            description={`No purchase bill found for ID ${billId}.`}
          />
        ) : (
          <BillDetailView
            bill={bill}
            outstanding={outstanding}
            isPendingApproval={isPendingApproval}
            canApprove={canApprove}
            canManage={canManage}
            isApprovePending={approveMutation.isPending}
            isCancelPending={cancelMutation.isPending}
            onApprove={handleApprove}
            onOpenCancelDialog={handleOpenCancelDialog}
          />
        )}
      </div>

      <ConfirmDialog
        open={postDialogOpen}
        onOpenChange={handlePostDialogChange}
        title="Post this bill?"
        description="Once posted, the bill will be locked and a journal entry will be created. This action cannot be undone."
        confirmLabel={postMutation.isPending ? "Posting…" : "Post bill"}
        isPending={postMutation.isPending}
        onConfirm={handlePostConfirm}
      />

      <AlertDialog open={cancelDialogOpen} onOpenChange={handleCancelDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel bill {bill?.billNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the bill and reverse any pending accounting entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Keep bill</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel bill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {bill && (
        <RecordVendorPaymentDialog
          billId={id}
          billNumber={bill.billNumber}
          remaining={outstanding}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
        />
      )}
    </PageWrapper>
  );
}
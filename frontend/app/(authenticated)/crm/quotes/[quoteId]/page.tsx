"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { useMotionVariants } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import {
  useQuoteDetail,
  useUpdateQuote,
  useUpdateQuoteStatus,
  useSendQuote,
  useDeleteQuote,
  useApproveQuote,
  useRejectQuote,
  useConvertQuoteToInvoice,
  useMarkQuoteSigned,
} from "@/hooks/api/crm/quotes";
import { useCan } from "@/hooks/api/access";
import { useQuoteSettings, usePricebooks, useQuoteTemplates } from "@/hooks/api/crm/pricebooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { QuoteStatusProgress } from "@/features/crm/quotes/components/quote-status-progress";
import {
  QuoteCreateSheet,
  type QuoteSubmitValues,
} from "@/features/crm/quotes/components/quote-create-sheet";
import { QuoteActionBar } from "@/features/crm/quotes/components/quote-action-bar";
import { QuoteApprovalBanner } from "@/features/crm/quotes/components/quote-approval-banner";
import { QuoteDetailContent } from "@/features/crm/quotes/components/quote-detail-content";
import { QuoteDetailDialogs } from "@/features/crm/quotes/components/quote-detail-dialogs";
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
} from "@/features/crm/quotes/lib/quote-utils";

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId: quoteIdStr } = use(params);
  const quoteId = Number(quoteIdStr);
  const router = useRouter();
  const { staggerContainer, fadeUp } = useMotionVariants();

  const [editOpen, setEditOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalRejectOpen, setApprovalRejectOpen] = useState(false);
  const [approvalRejectReason, setApprovalRejectReason] = useState("");
  const [signedDialogOpen, setSignedDialogOpen] = useState(false);
  const [signedDocRef, setSignedDocRef] = useState("");

  const { data, isLoading, isError, refetch } = useQuoteDetail(quoteId);
  const { data: settings } = useQuoteSettings();
  const { data: pricebooks } = usePricebooks();
  const { data: templates } = useQuoteTemplates();
  const updateStatus = useUpdateQuoteStatus();
  const sendQuote = useSendQuote();
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();
  const approveQuote = useApproveQuote();
  const rejectQuote = useRejectQuote();
  const convertToInvoice = useConvertQuoteToInvoice();
  const markSigned = useMarkQuoteSigned();
  const canApprove = useCan("crm:quotes:approve");

  const quote = data ?? null;

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const handleSend = useCallback(() => {
    /*
     * The dedicated route, not `PATCH { status: "SENT" }`. Only this one refuses
     * a quote that is pending discount approval, refuses one with no linked
     * contact, and emits `quote.sent` for the automation rules.
     */
    sendQuote.mutate(
      { id: quoteId },
      {
        onSuccess: () => toast.success("Quote sent"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, sendQuote]);

  const handleAccept = useCallback(() => {
    updateStatus.mutate(
      { id: quoteId, status: "ACCEPTED" },
      {
        onSuccess: () => toast.success("Quote accepted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, updateStatus]);

  const handleRejectOpen = useCallback(() => setRejectDialogOpen(true), []);

  const handleRejectConfirm = useCallback(() => {
    setRejectDialogOpen(false);
    updateStatus.mutate(
      { id: quoteId, status: "REJECTED", rejectionReason: rejectReason || undefined },
      {
        onSuccess: () => { toast.success("Quote rejected"); setRejectReason(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, updateStatus, rejectReason]);

  const handleDelete = useCallback(() => {
    deleteQuote.mutate(
      { id: quoteId },
      {
        onSuccess: () => {
          toast.success("Quote deleted");
          router.push("/crm/quotes");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, deleteQuote, router]);

  const handleApprove = useCallback(() => {
    approveQuote.mutate(
      { id: quoteId },
      {
        onSuccess: () => toast.success("Quote approved"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, approveQuote]);

  const handleApprovalRejectOpen = useCallback(() => setApprovalRejectOpen(true), []);

  const handleApprovalRejectConfirm = useCallback(() => {
    setApprovalRejectOpen(false);
    rejectQuote.mutate(
      { id: quoteId, reason: approvalRejectReason || undefined },
      {
        onSuccess: () => { toast.success("Approval rejected"); setApprovalRejectReason(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, rejectQuote, approvalRejectReason]);

  const handleConvertToInvoice = useCallback(() => {
    convertToInvoice.mutate(
      { id: quoteId },
      {
        onSuccess: (res) => toast.success(`Invoice ${res.invoice.invoiceNumber} created`),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, convertToInvoice]);

  const handleMarkSignedOpen = useCallback(() => setSignedDialogOpen(true), []);

  const handleMarkSignedConfirm = useCallback(() => {
    setSignedDialogOpen(false);
    markSigned.mutate(
      { id: quoteId, documentRef: signedDocRef || undefined },
      {
        onSuccess: () => { toast.success("Quote marked as signed"); setSignedDocRef(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, markSigned, signedDocRef]);

  const handleEditSubmit = useCallback((values: QuoteSubmitValues) => {
    updateQuote.mutate(
      { id: quoteId, ...values },
      {
        onSuccess: () => { toast.success("Quote updated"); setEditOpen(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, updateQuote]);

  if (isLoading) {
    return (
      <PageWrapper title="Quote" backHref="/crm/quotes">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Quote" backHref="/crm/quotes">
        <ErrorState
          title="Failed to load quote"
          description="There was an error loading this quote. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper title="Quote" backHref="/crm/quotes">
        <ErrorState
          title="Quote not found"
          description="This quote may have been removed or you may not have access to it."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title={quote.subject}
        backHref="/crm/quotes"
        subtitle={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">
              {quote.quoteNumber}
            </span>
            <Badge
              variant="outline"
              className={cn("text-micro", STATUS_BADGE_CLASSES[quote.status])}
            >
              {STATUS_LABELS[quote.status]}
            </Badge>
          </div>
        }
        actions={
          <QuoteActionBar
            quote={quote}
            canApprove={canApprove}
            onEdit={() => setEditOpen(true)}
            onSend={handleSend}
            onAccept={handleAccept}
            onRejectOpen={handleRejectOpen}
            onApprove={handleApprove}
            onApprovalRejectOpen={handleApprovalRejectOpen}
            onConvertToInvoice={handleConvertToInvoice}
            onMarkSignedOpen={handleMarkSignedOpen}
            onDelete={handleDelete}
            updateStatusPending={updateStatus.isPending}
            approvePending={approveQuote.isPending}
            rejectPending={rejectQuote.isPending}
            convertPending={convertToInvoice.isPending}
            deletePending={deleteQuote.isPending}
          />
        }
      >
        <QuoteApprovalBanner
          quote={quote}
          canApprove={canApprove}
          onApprove={handleApprove}
          onApprovalRejectOpen={handleApprovalRejectOpen}
          approvePending={approveQuote.isPending}
          rejectPending={rejectQuote.isPending}
        />

        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <QuoteStatusProgress status={quote.status} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <QuoteDetailContent quote={quote} />
          </motion.div>
        </motion.div>
      </PageWrapper>

      <QuoteCreateSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        editTarget={quote}
        isPending={updateQuote.isPending}
        onSubmit={handleEditSubmit}
        quoteSettings={settings ?? undefined}
        pricebooks={pricebooks ?? undefined}
        quoteTemplates={templates ?? undefined}
      />

      <QuoteDetailDialogs
        rejectDialogOpen={rejectDialogOpen}
        onRejectDialogOpenChange={setRejectDialogOpen}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onRejectConfirm={handleRejectConfirm}
        approvalRejectOpen={approvalRejectOpen}
        onApprovalRejectOpenChange={setApprovalRejectOpen}
        approvalRejectReason={approvalRejectReason}
        onApprovalRejectReasonChange={setApprovalRejectReason}
        onApprovalRejectConfirm={handleApprovalRejectConfirm}
        signedDialogOpen={signedDialogOpen}
        onSignedDialogOpenChange={setSignedDialogOpen}
        signedDocRef={signedDocRef}
        onSignedDocRefChange={setSignedDocRef}
        onMarkSignedConfirm={handleMarkSignedConfirm}
      />
    </>
  );
}

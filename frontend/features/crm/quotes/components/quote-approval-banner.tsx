"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Quote } from "@/types/crm/quotes";

interface QuoteApprovalBannerProps {
  quote: Quote;
  canApprove: boolean;
  onApprove: () => void;
  onApprovalRejectOpen: () => void;
  approvePending: boolean;
  rejectPending: boolean;
}

export function QuoteApprovalBanner({
  quote,
  canApprove,
  onApprove,
  onApprovalRejectOpen,
  approvePending,
  rejectPending,
}: QuoteApprovalBannerProps) {
  if (quote.approvalStatus === "pending") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-status-warning-ink shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-status-warning-ink">Pending Approval</p>
          <p className="text-xs text-status-warning-ink mt-0.5">
            This quote requires approval before it can be sent.
          </p>
        </div>
        {canApprove && (
          <div className="flex items-center gap-2 shrink-0">
            <LoadingButton
              size="sm"
              className="bg-status-success-fill hover:bg-status-success-fill-hover text-white h-7 text-xs"
              onClick={onApprove}
              isPending={approvePending}
              loadingText="Approving..."
            >
              Approve
            </LoadingButton>
            <LoadingButton
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 h-7 text-xs"
              onClick={onApprovalRejectOpen}
              isPending={rejectPending}
              loadingText="Rejecting..."
            >
              Reject
            </LoadingButton>
          </div>
        )}
      </div>
    );
  }

  if (quote.approvalStatus === "rejected") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-status-danger-rule bg-status-danger-surface px-4 py-3">
        <XCircle className="h-4 w-4 text-status-danger-ink shrink-0 mt-0.5" />
        <p className="text-sm text-status-danger-ink">Approval was rejected. Edit the quote and resubmit.</p>
      </div>
    );
  }

  if (quote.approvalStatus === "approved") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-status-success-rule bg-status-success-surface px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-status-success-ink shrink-0 mt-0.5" />
        <p className="text-sm text-status-success-ink">Quote approved — ready to send.</p>
      </div>
    );
  }

  return null;
}

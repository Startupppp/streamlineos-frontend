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
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">Pending Approval</p>
          <p className="text-xs text-amber-700 mt-0.5">
            This quote requires approval before it can be sent.
          </p>
        </div>
        {canApprove && (
          <div className="flex items-center gap-2 shrink-0">
            <LoadingButton
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
              onClick={onApprove}
              isPending={approvePending}
              loadingText="Approving..."
            >
              Approve
            </LoadingButton>
            <LoadingButton
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 h-7 text-xs"
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
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
        <p className="text-sm text-red-700">Approval was rejected. Edit the quote and resubmit.</p>
      </div>
    );
  }

  if (quote.approvalStatus === "approved") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-700">Quote approved — ready to send.</p>
      </div>
    );
  }

  return null;
}

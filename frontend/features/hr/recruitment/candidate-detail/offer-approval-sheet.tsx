"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetBody,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useApproveOffer, useRejectOfferApproval } from "@/hooks/api/hr/recruitment";
import type { CandidateOffer } from "@/hooks/api/hr/recruitment";
import { toast } from "sonner";

function formatINR(val: string | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val));
}

interface ApprovalSheetProps {
  offer: CandidateOffer;
  action: "approve" | "reject";
  candidateId: number;
  onClose: () => void;
}

export function ApprovalSheet({ offer, action, candidateId, onClose }: ApprovalSheetProps) {
  const [remarks, setRemarks] = useState("");
  const approve = useApproveOffer(candidateId);
  const reject = useRejectOfferApproval(candidateId);
  const isPending = approve.isPending || reject.isPending;

  const handleSubmit = useCallback(() => {
    if (action === "approve") {
      approve.mutate({ offerId: offer.id, remarks: remarks || undefined }, {
        onSuccess: () => { toast.success("Offer approved"); onClose(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    } else {
      reject.mutate({ offerId: offer.id, remarks: remarks || undefined }, {
        onSuccess: () => { toast.success("Offer approval rejected"); onClose(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [action, offer.id, remarks, approve, reject, onClose]);

  function handleRemarksChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setRemarks(e.target.value); }
  function handleSheetOpenChange(v: boolean) { if (!v) onClose(); }

  return (
    <Sheet open onOpenChange={handleSheetOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">
            {action === "approve" ? "Approve Offer" : "Reject Offer Approval"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {action === "approve"
              ? "Approving will mark the offer as Sent."
              : "Rejecting will return the offer to Approval Rejected status."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-4 py-4 space-y-4">
          <div className="rounded-lg border px-4 py-3 space-y-1 bg-muted/40">
            <p className="text-xs text-muted-foreground">Offer for</p>
            <p className="text-sm font-medium">{offer.offeredDesignation ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{formatINR(offer.offeredSalary)}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Remarks (optional)</label>
            <Textarea
              placeholder={action === "approve" ? "Any approval notes..." : "Reason for rejection..."}
              rows={3}
              value={remarks}
              onChange={handleRemarksChange}
            />
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <LoadingButton
            className="flex-1"
            variant={action === "reject" ? "destructive" : "default"}
            onClick={handleSubmit}
            isPending={isPending}
            loadingText="Saving…"
          >
            {action === "approve" ? "Approve" : "Reject"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

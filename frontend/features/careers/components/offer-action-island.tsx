"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { PublicOffer } from "@/lib/public-fetch";

interface Props {
  offer: PublicOffer;
  token: string;
}

export function OfferActionIsland({ offer, token }: Props) {
  const router = useRouter();
  const [responding, setResponding] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterSalary, setCounterSalary] = useState("");
  const [counterMessage, setCounterMessage] = useState("");

  const handleRespond = useCallback(async (
    action: "accept" | "decline" | "counter",
    extra?: { declineReason?: string; counterSalary?: number; counterMessage?: string },
  ) => {
    setResponding(true);
    try {
      await apiClient.patch<{ success: boolean; status: string }>(
        `/public/offer/${token}/respond`,
        { action, ...extra },
      );
      setDeclineOpen(false);
      setCounterOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e) || "Unable to respond to this offer. Try again.");
    } finally {
      setResponding(false);
    }
  }, [token, router]);

  const handleAccept = useCallback(() => { void handleRespond("accept"); }, [handleRespond]);
  const handleOpenDecline = useCallback(() => setDeclineOpen(true), []);
  const handleConfirmDecline = useCallback(() => {
    void handleRespond("decline", { declineReason: declineReason || undefined });
  }, [handleRespond, declineReason]);
  const handleOpenCounter = useCallback(() => setCounterOpen(true), []);
  const handleConfirmCounter = useCallback(() => {
    const salaryNum = counterSalary ? Number(counterSalary) : undefined;
    if (salaryNum === undefined || !Number.isFinite(salaryNum) || salaryNum <= 0) {
      toast.error("Enter a valid counter salary");
      return;
    }
    void handleRespond("counter", {
      counterSalary: salaryNum,
      counterMessage: counterMessage.trim() || undefined,
    });
  }, [handleRespond, counterSalary, counterMessage]);
  const handleDeclineReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDeclineReason(e.target.value), []);
  const handleCounterSalaryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCounterSalary(e.target.value), []);
  const handleCounterMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setCounterMessage(e.target.value), []);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Designation</p>
          <p className="font-medium">{offer.offeredDesignation ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Offered Salary</p>
          <p className="font-medium">
            {offer.offeredSalary
              ? formatCurrencyFull(offer.offeredSalary, offer.currency, undefined, 0)
              : "—"}
          </p>
        </div>
        {offer.joiningDate && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Joining Date</p>
            <p className="font-medium">{format(new Date(offer.joiningDate), "dd MMM yyyy")}</p>
          </div>
        )}
        {offer.validUntil && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Offer Valid Until</p>
            <p className="font-medium">{format(new Date(offer.validUntil), "dd MMM yyyy")}</p>
          </div>
        )}
      </div>

      {offer.notes && (
        <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1 text-xs uppercase tracking-wide">Additional Notes</p>
          <p>{offer.notes}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <LoadingButton className="flex-1" onClick={handleAccept} isPending={responding} loadingText="Processing…">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Accept Offer
        </LoadingButton>
        <LoadingButton variant="outline" className="flex-1" onClick={handleOpenDecline} isPending={responding}>
          Decline
        </LoadingButton>
      </div>
      <LoadingButton variant="ghost" className="w-full text-xs" onClick={handleOpenCounter} isPending={responding}>
        Propose Different Terms
      </LoadingButton>

      <p className="text-xs text-center text-muted-foreground">
        By accepting, you agree to the terms outlined in this offer.
      </p>

      <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              Please let us know why you&apos;re declining (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for declining (optional)"
            rows={3}
            value={declineReason}
            onChange={handleDeclineReasonChange}
            className="mx-6 mb-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDecline}
            >
              Decline Offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={counterOpen} onOpenChange={setCounterOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Propose different terms</AlertDialogTitle>
            <AlertDialogDescription>
              Let us know what you&apos;re looking for and we&apos;ll get back to you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mx-6 mb-2 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Proposed Salary</Label>
              <Input type="number" placeholder="e.g. 1400000" value={counterSalary} onChange={handleCounterSalaryChange} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Message (optional)</Label>
              <Textarea rows={3} placeholder="Anything else you'd like to share..." value={counterMessage} onChange={handleCounterMessageChange} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCounter} disabled={!counterSalary}>
              Send Proposal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

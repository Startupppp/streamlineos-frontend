"use client";

import { useState, useCallback } from "react";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { OfferNegotiationSheet } from "./offer-negotiation-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { LoadingState } from "@/components/shared/loading-state";
import {
  useCandidateOffers,
  useCreateCandidateOffer,
  useUpdateCandidateOffer,
  useDeleteCandidateOffer,
  useSubmitOfferForApproval,
  useApproveOffer,
  useRejectOfferApproval,
  type CandidateOffer,
} from "@/hooks/api/hr/recruitment";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_CONFIG: Record<CandidateOffer["offerStatus"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "outline" },
  VIEWED: { label: "Viewed", variant: "outline" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  DECLINED: { label: "Declined", variant: "destructive" },
  COUNTERED: { label: "Countered", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "secondary" },
  APPROVAL_REJECTED: { label: "Approval Rejected", variant: "destructive" },
};

const UPDATABLE_STATUSES: CandidateOffer["offerStatus"][] = [
  "DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "COUNTERED", "EXPIRED",
];

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

function ApprovalSheet({ offer, action, candidateId, onClose }: ApprovalSheetProps) {
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

  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
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
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            className="flex-1"
            variant={action === "reject" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Saving…" : action === "approve" ? "Approve" : "Reject"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface Props {
  candidateId: number;
}

export function OffersTab({ candidateId }: Props) {
  const canApprove = useCan("hr:offers:approve");

  const { data: offers, isLoading } = useCandidateOffers(candidateId);
  const createOffer = useCreateCandidateOffer(candidateId);
  const updateOffer = useUpdateCandidateOffer(candidateId);
  const deleteOffer = useDeleteCandidateOffer(candidateId);
  const submitForApproval = useSubmitOfferForApproval(candidateId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [offeredSalary, setOfferedSalary] = useState("");
  const [offeredDesignation, setOfferedDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [offerLetterUrl, setOfferLetterUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [approvalAction, setApprovalAction] = useState<{ offer: CandidateOffer; action: "approve" | "reject" } | null>(null);
  const [historyOffer, setHistoryOffer] = useState<CandidateOffer | null>(null);

  const handleCreate = useCallback(() => {
    createOffer.mutate(
      {
        offeredSalary: offeredSalary ? Number(offeredSalary) : undefined,
        offeredDesignation: offeredDesignation || undefined,
        joiningDate: joiningDate || undefined,
        validUntil: validUntil || undefined,
        offerLetterUrl: offerLetterUrl || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Offer created");
          setSheetOpen(false);
          setOfferedSalary(""); setOfferedDesignation(""); setJoiningDate("");
          setValidUntil(""); setOfferLetterUrl(""); setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [offeredSalary, offeredDesignation, joiningDate, validUntil, offerLetterUrl, notes, createOffer]);

  const handleStatusChange = useCallback(
    (offerId: number, offerStatus: CandidateOffer["offerStatus"]) => {
      updateOffer.mutate(
        { offerId, offerStatus },
        {
          onSuccess: () => toast.success("Offer status updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateOffer],
  );

  const handleDelete = useCallback((offerId: number) => {
    deleteOffer.mutate(offerId, {
      onSuccess: () => { toast.success("Offer deleted"); setDeleteConfirmId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteOffer]);

  const handleSubmitForApproval = useCallback((offerId: number) => {
    submitForApproval.mutate(offerId, {
      onSuccess: () => toast.success("Offer submitted for CEO approval"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [submitForApproval]);

  const handleCopyOfferLink = useCallback(async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/offer/${token}`);
    toast.success("Offer link copied");
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Track offer letters and candidate responses</p>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Offer
        </Button>
      </div>

      {isLoading ? (
        <LoadingState variant="list" rows={2} />
      ) : !offers?.length ? (
        <EmptyState illustration={<EmptyDocumentsIllustration />} title="No offers created yet" compact />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const config = STATUS_CONFIG[offer.offerStatus] ?? STATUS_CONFIG.DRAFT;
            return (
              <Card key={offer.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                        {offer.validUntil && (
                          <span className="text-xs text-muted-foreground">
                            Valid until {format(new Date(offer.validUntil), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                      {offer.offeredDesignation && (
                        <p className="text-sm font-medium">{offer.offeredDesignation}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteConfirmId(offer.id)}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                    <div>
                      <p className="text-muted-foreground">Salary</p>
                      <p className="font-medium">{formatINR(offer.offeredSalary)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Joining Date</p>
                      <p className="font-medium">
                        {offer.joiningDate ? format(new Date(offer.joiningDate), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sent At</p>
                      <p className="font-medium">
                        {offer.sentAt ? format(new Date(offer.sentAt), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Response</p>
                      <p className="font-medium">
                        {offer.respondedAt ? format(new Date(offer.respondedAt), "dd MMM yyyy") : "—"}
                      </p>
                    </div>
                  </div>

                  {offer.approvalRemarks && (
                    <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 mb-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium mb-0.5">Approval Remarks</p>
                      <p className="text-xs">{offer.approvalRemarks}</p>
                    </div>
                  )}

                  {offer.offerLetterUrl && (
                    <a
                      href={offer.offerLetterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline block mb-3"
                    >
                      View Offer Letter →
                    </a>
                  )}

                  {offer.notes && (
                    <p className="text-xs text-muted-foreground mb-3">{offer.notes}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {offer.offerStatus === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleSubmitForApproval(offer.id)}
                        disabled={submitForApproval.isPending}
                      >
                        <svg className="mr-1.5 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                        Submit for CEO Approval
                      </Button>
                    )}

                    {canApprove && offer.offerStatus === "PENDING_APPROVAL" && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setApprovalAction({ offer, action: "approve" })}
                        >
                          <svg className="mr-1.5 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => setApprovalAction({ offer, action: "reject" })}
                        >
                          <svg className="mr-1.5 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          Reject
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setHistoryOffer(offer)}
                    >
                      History
                    </Button>

                    {offer.acceptanceToken && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleCopyOfferLink(offer.acceptanceToken!)}
                      >
                        Copy Offer Link
                      </Button>
                    )}

                    {UPDATABLE_STATUSES.includes(offer.offerStatus) && (
                      <>
                        <span className="text-xs text-muted-foreground">Update status:</span>
                        <Select
                          value={offer.offerStatus}
                          onValueChange={(v) => handleStatusChange(offer.id, v as CandidateOffer["offerStatus"])}
                        >
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="w-[var(--radix-select-trigger-width)]">
                            {UPDATABLE_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {STATUS_CONFIG[s].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Create Offer</SheetTitle>
            <SheetDescription className="text-xs">Create an offer for this candidate.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offered Designation</label>
              <Input placeholder="e.g. Senior Developer" value={offeredDesignation} onChange={(e) => setOfferedDesignation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offered Salary (₹/year)</label>
              <Input type="number" placeholder="e.g. 1200000" value={offeredSalary} onChange={(e) => setOfferedSalary(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Joining Date</label>
                <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valid Until</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offer Letter URL</label>
              <Input placeholder="https://..." value={offerLetterUrl} onChange={(e) => setOfferLetterUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Any additional notes..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={createOffer.isPending}>
              {createOffer.isPending ? "Creating..." : "Create Offer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId != null && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {approvalAction && (
        <ApprovalSheet
          offer={approvalAction.offer}
          action={approvalAction.action}
          candidateId={candidateId}
          onClose={() => setApprovalAction(null)}
        />
      )}

      {historyOffer && (
        <OfferNegotiationSheet
          candidateId={candidateId}
          offer={historyOffer}
          onClose={() => setHistoryOffer(null)}
        />
      )}
    </div>
  );
}

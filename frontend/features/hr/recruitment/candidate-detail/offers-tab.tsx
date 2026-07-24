"use client";

import { useState, useCallback } from "react";
import { CheckIcon, PlusIcon, SendIcon, TrashIcon, XIcon } from "@animateicons/react/lucide";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { OfferNegotiationSheet } from "./offer-negotiation-sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetBody,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
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

interface OfferCardProps {
  offer: CandidateOffer;
  canApprove: boolean;
  onDelete: (id: number) => void;
  onSubmitForApproval: (id: number) => void;
  onApprovalAction: (offer: CandidateOffer, action: "approve" | "reject") => void;
  onViewHistory: (offer: CandidateOffer) => void;
  onCopyLink: (token: string) => void;
  onStatusChange: (offerId: number, status: CandidateOffer["offerStatus"]) => void;
  isSubmittingApproval: boolean;
}

function OfferCard({
  offer,
  canApprove,
  onDelete,
  onSubmitForApproval,
  onApprovalAction,
  onViewHistory,
  onCopyLink,
  onStatusChange,
  isSubmittingApproval,
}: OfferCardProps) {
  const config = STATUS_CONFIG[offer.offerStatus] ?? STATUS_CONFIG.DRAFT;

  function handleDelete() { onDelete(offer.id); }
  function handleSubmitForApproval() { onSubmitForApproval(offer.id); }
  function handleApprove() { onApprovalAction(offer, "approve"); }
  function handleReject() { onApprovalAction(offer, "reject"); }
  function handleViewHistory() { onViewHistory(offer); }
  function handleCopyLink() { if (offer.acceptanceToken) onCopyLink(offer.acceptanceToken); }
  function handleStatusChange(v: string) { onStatusChange(offer.id, v as CandidateOffer["offerStatus"]); }

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
          <TooltipIconButton
            icon={TrashIcon}
            label="Delete offer"
            className="w-7 text-destructive"
            onClick={handleDelete}
          />
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
            className="text-xs text-primary hover:text-primary/80 hover:underline block mb-3"
          >
            View Offer Letter →
          </a>
        )}

        {offer.notes && (
          <p className="text-xs text-muted-foreground mb-3">{offer.notes}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {offer.offerStatus === "DRAFT" && (
            <AnimatedIconButton
              icon={SendIcon}
              iconSize={12}
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={handleSubmitForApproval}
              disabled={isSubmittingApproval}
            >
              Submit for CEO Approval
            </AnimatedIconButton>
          )}

          {canApprove && offer.offerStatus === "PENDING_APPROVAL" && (
            <>
              <AnimatedIconButton icon={CheckIcon} iconSize={12} size="sm" variant="secondary" className="text-xs gap-1.5" onClick={handleApprove}>
                Approve
              </AnimatedIconButton>
              <AnimatedIconButton icon={XIcon} iconSize={12} size="sm" variant="destructive" className="text-xs gap-1.5" onClick={handleReject}>
                Reject
              </AnimatedIconButton>
            </>
          )}

          <Button size="sm" variant="ghost" className="text-xs" onClick={handleViewHistory}>
            History
          </Button>

          {offer.acceptanceToken && (
            <Button size="sm" variant="ghost" className="text-xs" onClick={handleCopyLink}>
              Copy Offer Link
            </Button>
          )}

          {UPDATABLE_STATUSES.includes(offer.offerStatus) && (
            <>
              <span className="text-xs text-muted-foreground">Update status:</span>
              <Select value={offer.offerStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
}

interface Props {
  candidateId: number;
}

export function OffersTab({ candidateId }: Props) {
  const canApprove = useCan("hr:offers:approve");

  const { data: offers, isLoading, isError, refetch } = useCandidateOffers(candidateId);
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
    const salaryNum = offeredSalary ? Number(offeredSalary) : undefined;
    if (salaryNum !== undefined && (!Number.isFinite(salaryNum) || salaryNum <= 0)) {
      toast.error("Offer salary must be a positive number");
      return;
    }
    if (validUntil) {
      const expiry = new Date(validUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(expiry.getTime()) || expiry < today) {
        toast.error("Offer expiry must be today or a future date");
        return;
      }
    }
    if (joiningDate) {
      const join = new Date(joiningDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(join.getTime()) || join < today) {
        toast.error("Joining date must be today or a future date");
        return;
      }
    }
    if (offerLetterUrl.trim()) {
      try {
        const parsed = new URL(
          offerLetterUrl.startsWith("www.") ? `https://${offerLetterUrl}` : offerLetterUrl,
        );
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          toast.error("Offer letter URL must be a valid http(s) link");
          return;
        }
      } catch {
        toast.error("Offer letter URL must be a valid link");
        return;
      }
    }

    createOffer.mutate(
      {
        offeredSalary: salaryNum,
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

  function handleOpenCreateSheet() { setSheetOpen(true); }
  function handleRetry() { void refetch(); }
  function handleCloseCreateSheet() { setSheetOpen(false); }
  function handleOfferedDesignationChange(e: React.ChangeEvent<HTMLInputElement>) { setOfferedDesignation(e.target.value); }
  function handleOfferedSalaryChange(e: React.ChangeEvent<HTMLInputElement>) { setOfferedSalary(e.target.value); }
  function handleOfferLetterUrlChange(e: React.ChangeEvent<HTMLInputElement>) { setOfferLetterUrl(e.target.value); }
  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setNotes(e.target.value); }
  function handleAlertOpenChange(v: boolean) { if (!v) setDeleteConfirmId(null); }
  function handleConfirmDelete() { if (deleteConfirmId != null) handleDelete(deleteConfirmId); }
  function handleApprovalAction(offer: CandidateOffer, action: "approve" | "reject") { setApprovalAction({ offer, action }); }
  function handleCloseApproval() { setApprovalAction(null); }
  function handleCloseHistory() { setHistoryOffer(null); }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Track offer letters and candidate responses</p>
        <AnimatedIconButton icon={PlusIcon} size="sm" className="gap-1.5" onClick={handleOpenCreateSheet}>
          Create Offer
        </AnimatedIconButton>
      </div>

      {isLoading ? (
        <LoadingState variant="list" rows={8} />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center space-y-2">
          <p className="text-sm font-medium">Unable to load offers</p>
          <p className="text-xs text-muted-foreground">
            You may not have permission to view offers, or the server returned an unexpected response.
          </p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : !offers?.length ? (
        <RecruitmentEmptyState illustration={<EmptyDocumentsIllustration />} title="No offers created yet" compact />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              canApprove={canApprove}
              onDelete={setDeleteConfirmId}
              onSubmitForApproval={handleSubmitForApproval}
              onApprovalAction={handleApprovalAction}
              onViewHistory={setHistoryOffer}
              onCopyLink={handleCopyOfferLink}
              onStatusChange={handleStatusChange}
              isSubmittingApproval={submitForApproval.isPending}
            />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Create Offer</SheetTitle>
            <SheetDescription className="text-xs">Create an offer for this candidate.</SheetDescription>
          </SheetHeader>
          <SheetBody className="px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offered Designation</label>
              <Input placeholder="e.g. Senior Developer" value={offeredDesignation} onChange={handleOfferedDesignationChange} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offered Salary (₹/year)</label>
              <Input type="number" placeholder="e.g. 1200000" value={offeredSalary} onChange={handleOfferedSalaryChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Joining Date</label>
                <DatePicker value={joiningDate ?? ""} onChange={setJoiningDate} placeholder="Pick a date" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Valid Until</label>
                <DatePicker value={validUntil ?? ""} onChange={setValidUntil} placeholder="Pick a date" className="text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offer Letter URL</label>
              <Input placeholder="https://..." value={offerLetterUrl} onChange={handleOfferLetterUrlChange} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Any additional notes..." rows={3} value={notes} onChange={handleNotesChange} />
            </div>
          </SheetBody>
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCloseCreateSheet}>Cancel</Button>
            <LoadingButton className="flex-1" onClick={handleCreate} isPending={createOffer.isPending} loadingText="Creating...">
              Create Offer
            </LoadingButton>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
          onClose={handleCloseApproval}
        />
      )}

      {historyOffer && (
        <OfferNegotiationSheet
          candidateId={candidateId}
          offer={historyOffer}
          onClose={handleCloseHistory}
        />
      )}
    </div>
  );
}

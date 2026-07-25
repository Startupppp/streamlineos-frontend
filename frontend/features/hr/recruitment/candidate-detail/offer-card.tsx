"use client";

import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { CheckIcon, SendIcon, TrashIcon, XIcon } from "@animateicons/react/lucide";
import type { CandidateOffer } from "@/hooks/api/hr/recruitment";
import { format } from "date-fns";

export const STATUS_CONFIG: Record<CandidateOffer["offerStatus"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
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

export const UPDATABLE_STATUSES: CandidateOffer["offerStatus"][] = [
  "DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "COUNTERED", "EXPIRED",
];

export function formatINR(val: string | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val));
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

export function OfferCard({
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

"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReviewClaim, type InsuranceClaim } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const STATUS_OPTIONS = [
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
] as const;

const PAYOUT_ROUTES = [
  { value: "payroll_payable", label: "Payroll Payable" },
  { value: "finance_payable", label: "Finance Payable" },
  { value: "already_paid", label: "Already Paid" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: InsuranceClaim | null;
}

export function ClaimReviewSheet({ open, onOpenChange, claim }: Props) {
  const reviewClaim = useReviewClaim();

  const [status, setStatus] = useState<"in_review" | "approved" | "rejected">("in_review");
  const [rejectionReason, setRejectionReason] = useState("");
  const [payoutRoute, setPayoutRoute] = useState<string>("");

  const handleStatusChange = useCallback((v: string) => {
    if (v === "in_review" || v === "approved" || v === "rejected") setStatus(v);
  }, []);

  const handlePayoutRouteChange = useCallback((v: string) => {
    setPayoutRoute(v);
  }, []);

  const handleRejectionReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRejectionReason(e.target.value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!claim) return;
    toast.promise(
      reviewClaim.mutateAsync({
        claimId: claim.id,
        status,
        rejectionReason: status === "rejected" ? rejectionReason : undefined,
        payoutRoute: status === "approved" && payoutRoute ? payoutRoute : undefined,
      }),
      {
        loading: "Updating claim...",
        success: () => {
          onOpenChange(false);
          return "Claim updated";
        },
        error: (e: unknown) => getErrorMessage(e),
      },
    );
  }, [claim, status, rejectionReason, payoutRoute, reviewClaim, onOpenChange]);

  if (!claim) return null;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Review Claim"
      description={`Claim #${claim.claimNumber}`}
      onSubmit={handleSubmit}
      submitLabel="Submit Decision"
      isPending={reviewClaim.isPending}
    >
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Claimant</span>
          <span className="font-medium">{claim.user?.name ?? claim.user?.email ?? claim.userId}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Plan</span>
          <span className="font-medium">{claim.plan?.name ?? `Plan #${claim.planId}`}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold text-foreground">₹{(claim.amountCents / 100).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Submitted</span>
          <span>{formatDistanceToNow(new Date(claim.submittedAt), { addSuffix: true })}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Current Status</span>
          <Badge variant="outline" className="text-[10px]">{claim.status}</Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Decision</Label>
        <Select defaultValue="in_review" onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {status === "approved" && (
        <div className="space-y-1.5">
          <Label>Payout Route</Label>
          <Select onValueChange={handlePayoutRouteChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select payout route" />
            </SelectTrigger>
            <SelectContent>
              {PAYOUT_ROUTES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {status === "rejected" && (
        <div className="space-y-1.5">
          <Label>Rejection Reason</Label>
          <Textarea
            rows={3}
            placeholder="Explain why the claim is rejected..."
            value={rejectionReason}
            onChange={handleRejectionReasonChange}
          />
        </div>
      )}
    </HrSheet>
  );
}

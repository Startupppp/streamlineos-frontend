"use client";

import { useState, useCallback } from "react";
import { useAllReferrals, useUpdateReferralStatus } from "@/hooks/api/hr/recruitment/referrals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import type { CandidateReferral, ReferralStatus } from "@/types/hr/recruitment";

const STATUS_CONFIG: Record<ReferralStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SUBMITTED: { label: "Submitted", variant: "secondary" },
  REVIEWING: { label: "Reviewing", variant: "default" },
  HIRED: { label: "Hired", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  BONUS_PAID: { label: "Bonus Paid", variant: "default" },
};

interface BonusSheetProps {
  referral: CandidateReferral;
  onClose: () => void;
}

function BonusSheet({ referral, onClose }: BonusSheetProps) {
  const updateMutation = useUpdateReferralStatus();
  const [bonusAmount, setBonusAmount] = useState(referral.bonusAmount ?? "");

  const handleMarkPaid = async () => {
    const amount = parseFloat(String(bonusAmount));
    if (!bonusAmount || isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid bonus amount");
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: referral.id, status: "BONUS_PAID", bonusAmount: amount });
      toast.success("Bonus marked as paid");
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  function handleBonusAmountChange(e: React.ChangeEvent<HTMLInputElement>) { setBonusAmount(e.target.value); }
  function handleSheetOpenChange(v: boolean) { if (!v) onClose(); }

  return (
    <Sheet open onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Mark Bonus Paid</SheetTitle>
          <SheetDescription>
            Referral by {referral.referrer?.name ?? "Unknown"} for {referral.candidate?.firstName} {referral.candidate?.lastName}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bonus-amount">Bonus Amount (₹)</Label>
            <Input
              id="bonus-amount"
              type="number"
              min={1}
              value={bonusAmount}
              onChange={handleBonusAmountChange}
              placeholder="e.g. 25000"
            />
          </div>
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMarkPaid} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Mark Paid"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface ReferralCardProps {
  referral: CandidateReferral;
  onStatusChange: (id: number, status: ReferralStatus) => Promise<void>;
  onMarkBonus: (referral: CandidateReferral) => void;
  isUpdating: boolean;
}

function ReferralCard({ referral, onStatusChange, onMarkBonus, isUpdating }: ReferralCardProps) {
  const cfg = STATUS_CONFIG[referral.status];

  function handleStartReview() { void onStatusChange(referral.id, "REVIEWING"); }
  function handleMarkHired() { void onStatusChange(referral.id, "HIRED"); }
  function handleReject() { void onStatusChange(referral.id, "REJECTED"); }
  function handleMarkBonus() { onMarkBonus(referral); }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {referral.candidate?.firstName} {referral.candidate?.lastName}
              </span>
              <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
              {referral.jobPosting && (
                <Badge variant="outline" className="text-xs">{referral.jobPosting.title}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{referral.candidate?.email}</span>
              {referral.referrer && <span>Referred by {referral.referrer.name}</span>}
              {referral.relationship && <span className="capitalize">{referral.relationship}</span>}
              <span>{format(new Date(referral.createdAt), "MMM d, yyyy")}</span>
              {referral.bonusPaidAt && (
                <span className="text-green-600">
                  Bonus paid {format(new Date(referral.bonusPaidAt), "MMM d, yyyy")}
                  {referral.bonusAmount && ` · ₹${parseFloat(referral.bonusAmount).toLocaleString()}`}
                </span>
              )}
            </div>
            {referral.notes && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{referral.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {referral.status === "SUBMITTED" && (
              <Button variant="outline" size="sm" onClick={handleStartReview} disabled={isUpdating}>
                Start Review
              </Button>
            )}
            {referral.status === "REVIEWING" && (
              <>
                <Button variant="outline" size="sm" onClick={handleMarkHired} disabled={isUpdating}>
                  Mark Hired
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleReject} disabled={isUpdating}>
                  Reject
                </Button>
              </>
            )}
            {referral.status === "HIRED" && referral.bonusEligible && !referral.bonusPaidAt && (
              <Button size="sm" onClick={handleMarkBonus}>
                Mark Bonus Paid
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InternalReferralsTab() {
  const { data: referrals = [], isLoading } = useAllReferrals();
  const updateMutation = useUpdateReferralStatus();
  const [bonusReferral, setBonusReferral] = useState<CandidateReferral | null>(null);

  const handleStatusChange = useCallback(async (id: number, status: ReferralStatus) => {
    try {
      await updateMutation.mutateAsync({ id, status });
      toast.success("Status updated");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [updateMutation]);

  function handleCloseBonusSheet() { setBonusReferral(null); }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <>
      {referrals.length === 0 ? (
        <RecruitmentEmptyState
          illustration={<EmptyTeamIllustration />}
          title="No referrals yet"
          description="Referrals submitted by employees will appear here."
        />
      ) : (
        <div className="space-y-3">
          {referrals.map((referral) => (
            <ReferralCard
              key={referral.id}
              referral={referral}
              onStatusChange={handleStatusChange}
              onMarkBonus={setBonusReferral}
              isUpdating={updateMutation.isPending}
            />
          ))}
        </div>
      )}

      {bonusReferral && (
        <BonusSheet referral={bonusReferral} onClose={handleCloseBonusSheet} />
      )}
    </>
  );
}

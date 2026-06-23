"use client";

import { useState, useCallback } from "react";
import { useAllReferrals, useUpdateReferralStatus } from "@/lib/api/hooks/hr/recruitment/referrals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
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

  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mark Bonus Paid</SheetTitle>
          <SheetDescription>
            Referral by {referral.referrer?.name ?? "Unknown"} for {referral.candidate?.firstName} {referral.candidate?.lastName}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bonus-amount">Bonus Amount (₹)</Label>
            <Input
              id="bonus-amount"
              type="number"
              min={1}
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              placeholder="e.g. 25000"
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMarkPaid} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Mark Paid"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function ReferralsHRPage() {
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

  if (isLoading) {
    return (
      <PageWrapper title="Referrals" subtitle="All employee referrals and bonus tracking.">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Referrals"
      subtitle="Employee referrals — track candidates, hiring outcomes, and bonus payments."
    >
      {referrals.length === 0 ? (
        <EmptyState
          illustration={
            <svg className="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          title="No referrals yet"
          description="Referrals submitted by employees will appear here."
        />
      ) : (
        <div className="space-y-3">
          {referrals.map((referral) => {
            const cfg = STATUS_CONFIG[referral.status];
            return (
              <Card key={referral.id} className="shadow-sm">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(referral.id, "REVIEWING")}
                          disabled={updateMutation.isPending}
                        >
                          Start Review
                        </Button>
                      )}
                      {referral.status === "REVIEWING" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(referral.id, "HIRED")}
                            disabled={updateMutation.isPending}
                          >
                            Mark Hired
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleStatusChange(referral.id, "REJECTED")}
                            disabled={updateMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {referral.status === "HIRED" && referral.bonusEligible && !referral.bonusPaidAt && (
                        <Button size="sm" onClick={() => setBonusReferral(referral)}>
                          Mark Bonus Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {bonusReferral && (
        <BonusSheet referral={bonusReferral} onClose={() => setBonusReferral(null)} />
      )}
    </PageWrapper>
  );
}

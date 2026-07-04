"use client";

import { useState, useCallback } from "react";
import {
  useExternalReferrals,
  useUpdateExternalReferral,
  useExternalReferrers,
  useUpdateExternalReferrerStatus,
  type ExternalReferral,
  type ExternalReferralStatus,
} from "@/hooks/api/hr/recruitment/external-referrals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import { Users2 } from "lucide-react";

const STATUS_CONFIG: Record<ExternalReferralStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SUBMITTED: { label: "Submitted", variant: "secondary" },
  REVIEWING: { label: "Reviewing", variant: "default" },
  HIRED: { label: "Hired", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  INELIGIBLE: { label: "Ineligible (Duplicate)", variant: "outline" },
  REWARD_PENDING: { label: "Reward Pending", variant: "default" },
  REWARD_PAID: { label: "Reward Paid", variant: "default" },
};

interface RewardSheetProps {
  referral: ExternalReferral;
  onClose: () => void;
}

function RewardSheet({ referral, onClose }: RewardSheetProps) {
  const updateMutation = useUpdateExternalReferral();
  const [rewardAmount, setRewardAmount] = useState(referral.rewardAmount ?? "");

  const handleMarkPaid = async () => {
    const amount = parseFloat(String(rewardAmount));
    if (!rewardAmount || isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid reward amount");
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: referral.id, status: "REWARD_PAID", rewardAmount: amount });
      toast.success("Reward marked as paid");
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) { setRewardAmount(e.target.value); }
  function handleOpenChange(v: boolean) { if (!v) onClose(); }

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Mark Reward Paid</SheetTitle>
          <SheetDescription>
            Referred by {referral.referrer?.name ?? "Unknown"} for {referral.candidate?.firstName} {referral.candidate?.lastName}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reward-amount">Reward Amount (₹)</Label>
            <Input
              id="reward-amount"
              type="number"
              min={1}
              value={rewardAmount}
              onChange={handleAmountChange}
              placeholder="e.g. 15000"
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

function ManageReferrersSheet() {
  const { data: referrers = [], isLoading } = useExternalReferrers();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Users2 className="h-3.5 w-3.5" />
          Manage Referrers
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>External Referrers</SheetTitle>
          <SheetDescription>Everyone who has registered a referral link, with fraud controls.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
          ) : referrers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No external referrers registered yet.</p>
          ) : (
            referrers.map((r) => <ReferrerRow key={r.id} id={r.id} name={r.name} email={r.email} status={r.status} referralCount={r.referralCount} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReferrerRow({ id, name, email, status, referralCount }: { id: number; name: string; email: string; status: "ACTIVE" | "BLOCKED"; referralCount: number }) {
  const updateStatus = useUpdateExternalReferrerStatus(id);

  const handleToggle = async () => {
    try {
      await updateStatus.mutateAsync(status === "ACTIVE" ? "BLOCKED" : "ACTIVE");
      toast.success(status === "ACTIVE" ? "Referrer blocked" : "Referrer unblocked");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{email} · {referralCount} referral{referralCount === 1 ? "" : "s"}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={status === "ACTIVE" ? "secondary" : "destructive"} className="text-[10px]">{status}</Badge>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleToggle} disabled={updateStatus.isPending}>
          {status === "ACTIVE" ? "Block" : "Unblock"}
        </Button>
      </div>
    </div>
  );
}

interface ExternalReferralCardProps {
  referral: ExternalReferral;
  onStatusChange: (id: number, status: ExternalReferralStatus) => Promise<void>;
  onMarkReward: (referral: ExternalReferral) => void;
  isUpdating: boolean;
}

function ExternalReferralCard({ referral, onStatusChange, onMarkReward, isUpdating }: ExternalReferralCardProps) {
  const cfg = STATUS_CONFIG[referral.status];

  function handleStartReview() { void onStatusChange(referral.id, "REVIEWING"); }
  function handleMarkHired() { void onStatusChange(referral.id, "HIRED"); }
  function handleReject() { void onStatusChange(referral.id, "REJECTED"); }
  function handleRewardPending() { void onStatusChange(referral.id, "REWARD_PENDING"); }
  function handleMarkReward() { onMarkReward(referral); }

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
              {referral.referrer && <span>Referred by {referral.referrer.name} ({referral.referrer.email})</span>}
              <span>{format(new Date(referral.createdAt), "MMM d, yyyy")}</span>
              {referral.rewardPaidAt && (
                <span className="text-green-600">
                  Reward paid {format(new Date(referral.rewardPaidAt), "MMM d, yyyy")}
                  {referral.rewardAmount && ` · ₹${parseFloat(referral.rewardAmount).toLocaleString()}`}
                </span>
              )}
            </div>
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
            {referral.status === "HIRED" && (
              <Button variant="outline" size="sm" onClick={handleRewardPending} disabled={isUpdating}>
                Queue Reward
              </Button>
            )}
            {referral.status === "REWARD_PENDING" && (
              <Button size="sm" onClick={handleMarkReward}>
                Mark Reward Paid
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExternalReferralsTab() {
  const { data: referrals = [], isLoading } = useExternalReferrals();
  const updateMutation = useUpdateExternalReferral();
  const [rewardReferral, setRewardReferral] = useState<ExternalReferral | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const handleStatusChange = useCallback(async (id: number, status: ExternalReferralStatus) => {
    setPendingId(id);
    try {
      await updateMutation.mutateAsync({ id, status });
      toast.success("Status updated");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setPendingId(null);
    }
  }, [updateMutation]);

  function handleCloseReward() { setRewardReferral(null); }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <ManageReferrersSheet />
      </div>

      {referrals.length === 0 ? (
        <EmptyState
          illustration={<EmptyTeamIllustration />}
          title="No external referrals yet"
          description="Candidates referred by non-employees through your public referral portal will appear here."
        />
      ) : (
        <div className="space-y-3">
          {referrals.map((referral) => (
            <ExternalReferralCard
              key={referral.id}
              referral={referral}
              onStatusChange={handleStatusChange}
              onMarkReward={setRewardReferral}
              isUpdating={pendingId === referral.id}
            />
          ))}
        </div>
      )}

      {rewardReferral && (
        <RewardSheet referral={rewardReferral} onClose={handleCloseReward} />
      )}
    </>
  );
}

"use client";

import { useState, useCallback } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCandidateReferrals, useCreateReferral, useUpdateReferral } from "@/hooks/api/hr/recruitment";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetBody,
} from "@/components/ui/sheet";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface MarkPaidButtonProps {
  referralId: number;
  isPending: boolean;
  onMarkPaid: (id: number) => void;
}

function MarkPaidButton({ referralId, isPending, onMarkPaid }: MarkPaidButtonProps) {
  function handleClick() { onMarkPaid(referralId); }
  return (
    <LoadingButton size="sm" variant="outline" className="text-xs" onClick={handleClick} isPending={isPending} loadingText="Marking…">
      Mark Paid
    </LoadingButton>
  );
}

interface Props {
  candidateId: number;
}

export function ReferralsTab({ candidateId }: Props) {
  const { data: referrals, isLoading } = useCandidateReferrals(candidateId);
  const createReferral = useCreateReferral(candidateId);
  const updateReferral = useUpdateReferral(candidateId);
  const { iconRef: plusIconRef, hoverHandlers: plusHoverHandlers } = useAnimatedIcon();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [referredBy, setReferredBy] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [bonusEligible, setBonusEligible] = useState(false);

  const handleSheetOpenChange = useCallback((v: boolean) => setSheetOpen(v), []);
  const handleReferredByChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setReferredBy(e.target.value), []);
  const handleRelationshipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRelationship(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);
  const handleCancel = useCallback(() => setSheetOpen(false), []);

  const handleCreate = useCallback(() => {
    if (!referredBy.trim()) {
      toast.error("Referrer is required");
      return;
    }
    createReferral.mutate(
      { referredBy: referredBy.trim(), relationship: relationship.trim() || undefined, notes: notes.trim() || undefined, bonusEligible },
      {
        onSuccess: () => {
          toast.success("Referral recorded");
          setSheetOpen(false);
          setReferredBy("");
          setRelationship("");
          setNotes("");
          setBonusEligible(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [referredBy, relationship, notes, bonusEligible, createReferral]);

  const handleMarkPaid = useCallback(
    (referralId: number) => {
      updateReferral.mutate(
        { id: referralId, bonusPaidAt: new Date().toISOString() },
        {
          onSuccess: () => toast.success("Marked as paid"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateReferral],
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {referrals?.length ?? 0} referral{referrals?.length !== 1 ? "s" : ""}
        </p>
        <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button variant="outline" {...plusHoverHandlers}>
              <PlusIcon ref={plusIconRef} size={14} />
              Record Referral
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col p-0 gap-0">
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-base font-semibold">Record Referral</SheetTitle>
              <SheetDescription className="text-xs">Track who referred this candidate.</SheetDescription>
            </SheetHeader>
            <SheetBody className="px-4 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">
                  Referred By<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <Input placeholder="Employee name or ID" value={referredBy} onChange={handleReferredByChange} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Relationship</label>
                <Input placeholder="e.g. Former colleague" value={relationship} onChange={handleRelationshipChange} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <span className="text-xs font-medium text-foreground">Bonus eligible</span>
                <Switch checked={bonusEligible} onCheckedChange={setBonusEligible} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Notes</label>
                <Textarea placeholder="Any additional context..." value={notes} onChange={handleNotesChange} rows={3} />
              </div>
            </SheetBody>
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1 h-9" onClick={handleCancel}>Cancel</Button>
              <LoadingButton className="flex-1 h-9" onClick={handleCreate} isPending={createReferral.isPending} loadingText="Saving…">
                Save
              </LoadingButton>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {!referrals?.length ? (
        <RecruitmentEmptyState
          illustrationPreset="leads"
          title="No referrals recorded"
          description="Record who referred this candidate to track bonus eligibility."
          compact
        />
      ) : (
        <div className="space-y-3">
          {referrals.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Referred by {r.referredBy}</p>
                  {r.relationship && <p className="text-xs text-muted-foreground mt-0.5">{r.relationship}</p>}
                  {r.notes && <p className="text-xs text-muted-foreground mt-1.5">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.bonusEligible && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Gift className="h-2.5 w-2.5" />
                      Bonus eligible
                    </Badge>
                  )}
                  {r.bonusEligible && !r.bonusPaidAt && (
                    <MarkPaidButton referralId={r.id} isPending={updateReferral.isPending} onMarkPaid={handleMarkPaid} />
                  )}
                  {r.bonusPaidAt && (
                    <Badge variant="outline" className="text-[10px]">Paid</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

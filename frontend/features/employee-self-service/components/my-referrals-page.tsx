"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useSelfReferrals,
  useSubmitReferral,
} from "@/hooks/api/employee-self-service/referrals";
import { getErrorMessage } from "@/lib/get-error-message";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  relationship: "",
  notes: "",
};

export function MyReferralsPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const referrals = useSelfReferrals();
  const { mutate: submit, isPending } = useSubmitReferral();

  const handleFirstName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, firstName: event.target.value }));
  }, []);

  const handleLastName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, lastName: event.target.value }));
  }, []);

  const handleEmail = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, email: event.target.value }));
  }, []);

  const handleRelationship = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, relationship: event.target.value }));
  }, []);

  const handleNotes = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, notes: event.target.value }));
  }, []);

  const handleSubmit = useCallback(() => {
    submit(
      {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        relationship: form.relationship.trim() || undefined,
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Referral submitted");
          setForm(EMPTY_FORM);
          setOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [form, submit]);

  const rows = referrals.data ?? [];
  const state = usePageState({
    permission: "self:referrals",
    isLoading: referrals.isLoading,
    isError: referrals.isError,
    error: referrals.error,
    isEmpty: rows.length === 0,
  });

  const canSubmit =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.email.trim().length > 0;

  const referAction = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Refer someone</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refer a candidate</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="referral-first-name">First name</Label>
            <Input id="referral-first-name" value={form.firstName} onChange={handleFirstName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="referral-last-name">Last name</Label>
            <Input id="referral-last-name" value={form.lastName} onChange={handleLastName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="referral-email">Email</Label>
            <Input id="referral-email" type="email" value={form.email} onChange={handleEmail} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="referral-relationship">How do you know them?</Label>
            <Input
              id="referral-relationship"
              value={form.relationship}
              onChange={handleRelationship}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="referral-notes">Notes</Label>
            <Textarea id="referral-notes" value={form.notes} onChange={handleNotes} />
          </div>
        </div>
        <DialogFooter>
          <LoadingButton isPending={isPending} disabled={!canSubmit} onClick={handleSubmit}>
            Submit referral
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <PageWrapper
      title="My Referrals"
      subtitle="Candidates you have referred and where they stand."
      actions={referAction}
      state={state}
      onRetry={referrals.refetch}
      loading={
        <div className={PAGE_BODY_SKELETON_CLASS}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      }
      empty={
        <EmptyState
          illustrationPreset="team"
          title="No referrals yet"
          description="Refer someone you would work with again and track their progress here."
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {rows.map((referral) => (
          <Card key={referral.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {referral.candidate
                    ? `${referral.candidate.firstName} ${referral.candidate.lastName}`
                    : "Candidate"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {referral.jobPosting ? referral.jobPosting.title : "No role specified"}
                </p>
              </div>
              {referral.bonusEligible ? <Badge variant="secondary">Bonus eligible</Badge> : null}
              <Badge>{referral.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}

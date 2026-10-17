"use client";

import { Button } from "@/components/ui/button";
import {
  InvitationCard,
  InvitationHero,
  CardContent,
} from "@/components/auth/invitation-card";

interface InvitationErrorStateProps {
  onGoToSignIn: () => void;
}

export function InvitationAlreadyMemberState({
  onGoToSignIn,
}: InvitationErrorStateProps) {
  return (
    <div className="w-full max-w-[480px]">
      <InvitationCard>
        <InvitationHero
          title="Already a member"
          description="This invitation has already been accepted."
          verified={false}
        />
        <CardContent className="px-6 py-5">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            You are already a member of this organization. Sign in to continue
            working.
          </p>
          <Button type="button" className="w-full" onClick={onGoToSignIn}>
            Sign in
          </Button>
        </CardContent>
      </InvitationCard>
    </div>
  );
}

export function InvitationSuspendedState({
  onGoToSignIn,
}: InvitationErrorStateProps) {
  return (
    <div className="w-full max-w-[480px]">
      <InvitationCard>
        <InvitationHero
          title="Account suspended"
          description="Your account has been suspended and cannot join an organization."
          verified={false}
        />
        <CardContent className="px-6 py-5">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Contact your platform administrator to restore your account before
            accepting this invitation.
          </p>
          <Button type="button" className="w-full" onClick={onGoToSignIn}>
            Go to sign in
          </Button>
        </CardContent>
      </InvitationCard>
    </div>
  );
}

export function InvitationAtCapacityState({
  onGoToSignIn,
}: InvitationErrorStateProps) {
  return (
    <div className="w-full max-w-[480px]">
      <InvitationCard>
        <InvitationHero
          title="Organization at capacity"
          description="This organization has reached its member limit."
          verified={false}
        />
        <CardContent className="px-6 py-5">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Ask an organization administrator to upgrade the plan or free a
            seat, then request a new invitation.
          </p>
          <Button type="button" className="w-full" onClick={onGoToSignIn}>
            Go to sign in
          </Button>
        </CardContent>
      </InvitationCard>
    </div>
  );
}

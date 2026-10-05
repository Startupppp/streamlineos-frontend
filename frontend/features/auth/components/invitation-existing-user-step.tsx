"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  InvitationCard,
  InvitationHero,
  InvitationDetails,
  DeclineInvitationDialog,
  CardContent,
} from "@/components/auth/invitation-card";
import { useMotionVariants } from "@/lib/motion-variants";

interface InvitationExistingUserStepProps {
  organizationName: string;
  invitedEmail: string;
  role: string;
  sessionEmail: string | null | undefined;
  isSignedIn: boolean;
  signedInAsOtherAccount: boolean;
  isAcceptPending: boolean;
  isDeclinePending: boolean;
  declineOpen: boolean;
  onSetDeclineOpen: (open: boolean) => void;
  onAccept: () => void;
  onDecline: () => void;
  onConfirmDecline: () => void;
}

export function InvitationExistingUserStep({
  organizationName,
  invitedEmail,
  role,
  sessionEmail,
  isSignedIn,
  signedInAsOtherAccount,
  isAcceptPending,
  isDeclinePending,
  declineOpen,
  onSetDeclineOpen,
  onAccept,
  onDecline,
  onConfirmDecline,
}: InvitationExistingUserStepProps) {
  const { staggerContainer, fadeUp } = useMotionVariants();
  return (
    <motion.div
      className="w-full max-w-[480px]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <InvitationCard>
          <InvitationHero
            title="You're invited"
            description={`Join ${organizationName} with your existing StreamlineOS account.`}
          />
          <CardContent className="space-y-5 px-6 pb-6 pt-5">
            <InvitationDetails
              organizationName={organizationName}
              role={role}
              invitedEmail={invitedEmail}
              accountEmail={sessionEmail}
            />
            {signedInAsOtherAccount && (
              <p className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink">
                You are currently signed in as{" "}
                <span className="font-medium">{sessionEmail}</span>. Accepting
                will sign you in as the invited account instead.
              </p>
            )}
            <div className="space-y-2">
              <LoadingButton
                className="h-11 w-full gap-2 font-medium"
                onClick={onAccept}
                isPending={isAcceptPending}
              >
                {isSignedIn ? "Accept & join" : "Sign in & join"}
                <ArrowRight className="h-4 w-4" />
              </LoadingButton>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full text-muted-foreground hover:text-foreground"
                onClick={onDecline}
                disabled={isAcceptPending || isDeclinePending}
              >
                Decline invitation
              </Button>
            </div>
          </CardContent>
        </InvitationCard>
      </motion.div>
      <DeclineInvitationDialog
        open={declineOpen}
        onOpenChange={onSetDeclineOpen}
        organizationName={organizationName}
        isPending={isDeclinePending}
        onConfirm={onConfirmDecline}
      />
    </motion.div>
  );
}

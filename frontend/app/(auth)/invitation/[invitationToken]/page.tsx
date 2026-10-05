"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  signInWithMagicToken,
  useAcceptInvitation,
  useDeclineInvitation,
  useRequestInvitationOtp,
  useValidateInvitation,
} from "@/hooks/common/auth-hooks";
import { useConfirmedSessionClaimsRefresh } from "@/hooks/common/use-confirmed-session-claims-refresh";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError, getApiErrorCode } from "@/lib/api-envelope";
import {
  InvitationCard,
  InvitationHero,
  CardContent,
} from "@/components/auth/invitation-card";
import {
  invitationAcceptSchema,
  invitationOtpSchema,
  type InvitationAcceptFormValues,
  type InvitationOtpFormValues,
  canonicalEmail,
} from "./invitation-accept-schema";

import {
  InvitationAlreadyMemberState,
  InvitationSuspendedState,
  InvitationAtCapacityState,
} from "@/features/auth/components/invitation-acceptance-error";
import { persistPartialGrants } from "@/features/auth/components/post-invite-transition";
import { InvitationExistingUserStep } from "@/features/auth/components/invitation-existing-user-step";
import { InvitationOtpStep } from "@/features/auth/components/invitation-otp-step";
import { InvitationNewUserStep } from "@/features/auth/components/invitation-new-user-step";

const INVITATION_SIGN_IN_UNCONFIRMED_MESSAGE =
  "We could not confirm the sign-in for the invited account. Please sign in with that email to finish joining.";
const INVITATION_SIGN_IN_FAILED_MESSAGE =
  "That sign-in link is no longer valid. Please sign in with the invited email address.";

type AcceptanceBlocker = "already-member" | "suspended" | "at-capacity";

function classifyAcceptanceError(error: unknown): AcceptanceBlocker | null {
  if (!isApiError(error)) return null;
  const code = getApiErrorCode(error);
  if (code === "ALREADY_MEMBER" || code === "MEMBERSHIP_ARCHIVED") return "already-member";
  if (code === "ACCOUNT_SUSPENDED") return "suspended";
  if (code === "ORG_AT_CAPACITY") return "at-capacity";
  if (error.status === 409) return "already-member";
  return null;
}

export default function InvitationPage() {
  const router = useRouter();
  const params = useParams();
  const invitationToken =
    typeof params.invitationToken === "string" ? params.invitationToken : "";
  const { data: session } = useSession();
  const beginClaimsRefresh = useConfirmedSessionClaimsRefresh();

  const nameForm = useForm<InvitationAcceptFormValues>({
    resolver: zodResolver(invitationAcceptSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const otpForm = useForm<InvitationOtpFormValues>({
    resolver: zodResolver(invitationOtpSchema),
    defaultValues: { emailOtp: "" },
  });

  const [declineOpen, setDeclineOpen] = useState(false);
  const [isCompletingAcceptance, setIsCompletingAcceptance] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingNameValues, setPendingNameValues] =
    useState<InvitationAcceptFormValues | null>(null);
  const [acceptanceBlocker, setAcceptanceBlocker] =
    useState<AcceptanceBlocker | null>(null);
  const acceptingRef = useRef(false);

  const {
    data: invitation,
    error: invitationError,
    isPending: isValidating,
  } = useValidateInvitation(isCompletingAcceptance ? "" : invitationToken);

  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();
  const requestInvitationOtp = useRequestInvitationOtp();

  const openDecline = useCallback(() => setDeclineOpen(true), []);

  const goToSignIn = useCallback(() => router.push("/signin"), [router]);

  const confirmDecline = useCallback(() => {
    if (!invitationToken) return;
    declineInvitation.mutate(
      { token: invitationToken },
      {
        onSuccess: () => {
          setDeclineOpen(false);
          toast.success("Invitation declined. We let the sender know.");
          router.push("/signin");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [invitationToken, declineInvitation, router]);

  const autoLoginWithToken = useCallback(
    async (autoLoginToken: string, destination: string): Promise<void> => {
      const outcome = await signInWithMagicToken(autoLoginToken);
      if (outcome.status === "signed-in") {
        window.location.href = destination;
        return;
      }
      if (outcome.status === "indeterminate") {
        toast.error(INVITATION_SIGN_IN_UNCONFIRMED_MESSAGE);
        router.push("/signin");
        return;
      }
      toast.error(INVITATION_SIGN_IN_FAILED_MESSAGE);
      router.push("/signin");
    },
    [router],
  );

  const submitNameStep = useCallback(
    (values: InvitationAcceptFormValues) => {
      if (!invitationToken) {
        toast.error("Invalid invitation");
        return;
      }
      setPendingNameValues(values);
      requestInvitationOtp.mutate(
        { token: invitationToken },
        {
          onSuccess: () => {
            setOtpStep(true);
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [invitationToken, requestInvitationOtp],
  );

  const handleNameFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void nameForm.handleSubmit(submitNameStep)(event);
    },
    [nameForm, submitNameStep],
  );

  const completeExistingUserAccept = useCallback(
    (emailOtp: string) => {
      if (acceptingRef.current) return;
      if (!invitationToken) return;
      acceptingRef.current = true;
      const claimsRun = beginClaimsRefresh();
      acceptInvitation.mutate(
        { token: invitationToken, emailOtp },
        {
          onSuccess: async (data) => {
            setIsCompletingAcceptance(true);
            toast.success(
              `Joined ${invitation?.organizationName ?? "organization"}!`,
            );
            if (data?.autoLoginToken) {
              persistPartialGrants(data.skippedGrants ?? []);
              await autoLoginWithToken(data.autoLoginToken, "/post-invite");
              return;
            }
            const confirmed = await claimsRun.confirmOrWarn();
            if (!confirmed) {
              acceptingRef.current = false;
              setIsCompletingAcceptance(false);
              return;
            }
            persistPartialGrants(data.skippedGrants ?? []);
            router.push("/post-invite");
          },
          onError: (error) => {
            acceptingRef.current = false;
            const blocker = classifyAcceptanceError(error);
            if (blocker) {
              setAcceptanceBlocker(blocker);
            } else {
              toast.error(getErrorMessage(error));
            }
          },
        },
      );
    },
    [
      invitationToken,
      router,
      acceptInvitation,
      invitation,
      beginClaimsRefresh,
      autoLoginWithToken,
    ],
  );

  const submitOtpStep = useCallback(
    (values: InvitationOtpFormValues) => {
      if (acceptingRef.current) return;
      if (!invitationToken || !invitation) {
        toast.error("Invalid invitation");
        return;
      }
      // An existing account joins the org it was invited to; a new one is created
      // first. Both verify the same code, so the two branches meet here.
      if (invitation.userExists) {
        completeExistingUserAccept(values.emailOtp);
        return;
      }
      acceptingRef.current = true;
      acceptInvitation.mutate(
        {
          token: invitationToken,
          firstName: pendingNameValues?.firstName || undefined,
          lastName: pendingNameValues?.lastName || undefined,
          emailOtp: values.emailOtp,
        },
        {
          onSuccess: async (data) => {
            setIsCompletingAcceptance(true);
            toast.success("Account created! Signing you in...");
            if (data?.autoLoginToken) {
              persistPartialGrants(data.skippedGrants ?? []);
              await autoLoginWithToken(data.autoLoginToken, "/post-invite");
            } else {
              router.push("/signin");
            }
          },
          onError: (error) => {
            acceptingRef.current = false;
            const blocker = classifyAcceptanceError(error);
            if (blocker) {
              setAcceptanceBlocker(blocker);
            } else {
              toast.error(getErrorMessage(error));
            }
          },
        },
      );
    },
    [
      invitationToken,
      invitation,
      acceptInvitation,
      pendingNameValues,
      router,
      autoLoginWithToken,
      completeExistingUserAccept,
    ],
  );

  const handleOtpFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void otpForm.handleSubmit(submitOtpStep)(event);
    },
    [otpForm, submitOtpStep],
  );

  const handleResendOtp = useCallback(() => {
    if (!invitationToken) return;
    requestInvitationOtp.mutate(
      { token: invitationToken },
      {
        onSuccess: () => {
          otpForm.reset({ emailOtp: "" });
          toast.success("A new verification code was sent.");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [invitationToken, requestInvitationOtp, otpForm]);

  const handleExistingUserAccept = useCallback(() => {
    if (acceptingRef.current) return;
    if (!invitationToken) return;
    if (!session) {
      router.push(`/signin?callbackUrl=/invitation/${invitationToken}`);
      return;
    }
    requestInvitationOtp.mutate(
      { token: invitationToken },
      {
        onSuccess: () => {
          setOtpStep(true);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [invitationToken, session, router, requestInvitationOtp]);

  if (isValidating || isCompletingAcceptance) {
    return (
      <InvitationCard className="w-full max-w-[480px]">
        <div className="flex items-start gap-3.5 border-b border-border px-5 py-5 sm:px-6 sm:py-6">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="w-full space-y-2 pt-0.5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </InvitationCard>
    );
  }

  if (acceptanceBlocker === "already-member") {
    return <InvitationAlreadyMemberState onGoToSignIn={goToSignIn} />;
  }

  if (acceptanceBlocker === "suspended") {
    return <InvitationSuspendedState onGoToSignIn={goToSignIn} />;
  }

  if (acceptanceBlocker === "at-capacity") {
    return <InvitationAtCapacityState onGoToSignIn={goToSignIn} />;
  }

  if (invitationError || !invitation) {
    const isExpired =
      invitationError !== null &&
      isApiError(invitationError) &&
      invitationError.status === 404;
    return (
      <div className="w-full max-w-[480px]">
        <InvitationCard>
          <InvitationHero
            title={isExpired ? "Invitation expired" : "Invitation unavailable"}
            description={
              isExpired
                ? "This invitation link has expired or was already used."
                : getErrorMessage(invitationError)
            }
            verified={false}
          />
          <CardContent className="px-6 py-5">
            <p className="mb-4 text-center text-sm text-muted-foreground">
              {isExpired
                ? "Ask an organization administrator to send a new invitation."
                : "Ask an organization administrator to send a new invitation if this link has expired or was replaced."}
            </p>
            <Button className="w-full" onClick={goToSignIn}>
              Go to sign in
            </Button>
          </CardContent>
        </InvitationCard>
      </div>
    );
  }

  if (invitation.userExists && !otpStep) {
    const sessionEmail = session?.user?.email;
    const signedInAsOtherAccount =
      sessionEmail !== undefined &&
      sessionEmail !== null &&
      canonicalEmail(sessionEmail) !== canonicalEmail(invitation.email);
    return (
      <InvitationExistingUserStep
        organizationName={invitation.organizationName}
        invitedEmail={invitation.email}
        role={invitation.role}
        sessionEmail={sessionEmail}
        isSignedIn={!!session}
        signedInAsOtherAccount={signedInAsOtherAccount}
        isAcceptPending={acceptInvitation.isPending}
        isDeclinePending={declineInvitation.isPending}
        declineOpen={declineOpen}
        onSetDeclineOpen={setDeclineOpen}
        onAccept={handleExistingUserAccept}
        onDecline={openDecline}
        onConfirmDecline={confirmDecline}
      />
    );
  }

  if (otpStep) {
    return (
      <InvitationOtpStep
        invitedEmail={invitation.email}
        otpForm={otpForm}
        onSubmit={handleOtpFormSubmit}
        onResend={handleResendOtp}
        isVerifyPending={acceptInvitation.isPending}
        isResendPending={requestInvitationOtp.isPending}
      />
    );
  }

  return (
    <InvitationNewUserStep
      organizationName={invitation.organizationName}
      invitedEmail={invitation.email}
      role={invitation.role}
      nameForm={nameForm}
      onSubmit={handleNameFormSubmit}
      isOtpPending={requestInvitationOtp.isPending}
      isDeclinePending={declineInvitation.isPending}
      declineOpen={declineOpen}
      onSetDeclineOpen={setDeclineOpen}
      onDecline={openDecline}
      onConfirmDecline={confirmDecline}
    />
  );
}

"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { ArrowRight } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError, getApiErrorCode } from "@/lib/api-envelope";
import {
  InvitationCard,
  InvitationHero,
  InvitationDetails,
  DeclineInvitationDialog,
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

const INVITATION_SIGN_IN_UNCONFIRMED_MESSAGE =
  "We could not confirm the sign-in for the invited account. Please sign in with that email to finish joining.";
const INVITATION_SIGN_IN_FAILED_MESSAGE =
  "That sign-in link is no longer valid. Please sign in with the invited email address.";

type AcceptanceBlocker = "already-member" | "suspended" | "at-capacity";

function classifyAcceptanceError(error: unknown): AcceptanceBlocker | null {
  if (!isApiError(error)) return null;
  const code = getApiErrorCode(error);
  if (code === "ALREADY_MEMBER" || code === "MEMBERSHIP_ARCHIVED" || error.status === 409)
    return "already-member";
  if (code === "ACCOUNT_SUSPENDED") return "suspended";
  if (code === "ORG_AT_CAPACITY") return "at-capacity";
  return null;
}

export default function InvitationPage() {
  const { staggerContainer, fadeUp } = useMotionVariants();
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

  // `otpStep` first: an existing account now verifies the same code as a new one,
  // so this card must yield to the OTP form once one has been sent.
  if (invitation.userExists && !otpStep) {
    const sessionEmail = session?.user?.email;
    const signedInAsOtherAccount =
      sessionEmail !== undefined &&
      sessionEmail !== null &&
      canonicalEmail(sessionEmail) !== canonicalEmail(invitation.email);

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
              description={`Join ${invitation.organizationName} with your existing StreamlineOS account.`}
            />
            <CardContent className="space-y-5 px-6 pb-6 pt-5">
              <InvitationDetails
                organizationName={invitation.organizationName}
                role={invitation.role}
                invitedEmail={invitation.email}
                accountEmail={session?.user?.email}
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
                  onClick={handleExistingUserAccept}
                  isPending={acceptInvitation.isPending}
                >
                  {session ? "Accept & join" : "Sign in & join"}
                  <ArrowRight className="h-4 w-4" />
                </LoadingButton>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full text-muted-foreground hover:text-foreground"
                  onClick={openDecline}
                  disabled={
                    acceptInvitation.isPending || declineInvitation.isPending
                  }
                >
                  Decline invitation
                </Button>
              </div>
            </CardContent>
          </InvitationCard>
        </motion.div>
        <DeclineInvitationDialog
          open={declineOpen}
          onOpenChange={setDeclineOpen}
          organizationName={invitation.organizationName}
          isPending={declineInvitation.isPending}
          onConfirm={confirmDecline}
        />
      </motion.div>
    );
  }

  if (otpStep) {
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
              title="Verify your email"
              description={`Enter the 6-digit code sent to ${invitation.email} to confirm your identity.`}
            />
            <CardContent className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
              <Form {...otpForm}>
                <form
                  onSubmit={handleOtpFormSubmit}
                  className="space-y-4"
                  aria-busy={acceptInvitation.isPending}
                >
                  <FormField
                    control={otpForm.control}
                    name="emailOtp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-xs font-medium">
                          Verification code
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6-digit code"
                            autoComplete="one-time-code"
                            disabled={acceptInvitation.isPending}
                            className="text-center text-lg font-mono tracking-widest"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-1.5 pt-0.5">
                    <LoadingButton
                      type="submit"
                      className="h-11 w-full gap-2 font-medium"
                      isPending={acceptInvitation.isPending}
                      loadingText="Verifying..."
                    >
                      Verify & create account
                      <ArrowRight className="h-4 w-4" />
                    </LoadingButton>

                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 w-full text-muted-foreground hover:text-foreground"
                      onClick={handleResendOtp}
                      disabled={
                        acceptInvitation.isPending ||
                        requestInvitationOtp.isPending
                      }
                    >
                      Resend code
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </InvitationCard>
        </motion.div>
      </motion.div>
    );
  }

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
            description={`Create your account to join ${invitation.organizationName}.`}
          />
          <CardContent className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <InvitationDetails
              organizationName={invitation.organizationName}
              role={invitation.role}
              invitedEmail={invitation.email}
            />

            <Form {...nameForm}>
              <form
                onSubmit={handleNameFormSubmit}
                className="mt-4 space-y-3.5"
                aria-busy={requestInvitationOtp.isPending}
              >
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  <FormField
                    control={nameForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-xs font-medium">
                          First name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type="text"
                            placeholder="Your first name"
                            autoComplete="given-name"
                            disabled={requestInvitationOtp.isPending}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={nameForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-xs font-medium">
                          Last name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type="text"
                            placeholder="Your last name"
                            autoComplete="family-name"
                            disabled={requestInvitationOtp.isPending}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <LoadingButton
                    type="submit"
                    className="h-11 w-full gap-2 font-medium"
                    isPending={requestInvitationOtp.isPending}
                    loadingText="Sending verification code..."
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </LoadingButton>

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full text-muted-foreground hover:text-foreground"
                    onClick={openDecline}
                    disabled={
                      requestInvitationOtp.isPending ||
                      declineInvitation.isPending
                    }
                  >
                    Decline invitation
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </InvitationCard>
      </motion.div>
      <DeclineInvitationDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        organizationName={invitation.organizationName}
        isPending={declineInvitation.isPending}
        onConfirm={confirmDecline}
      />
    </motion.div>
  );
}

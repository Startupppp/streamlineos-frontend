"use client";

import { useCallback, useState } from "react";
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
  useValidateInvitation,
} from "@/hooks/common/auth-hooks";
import { useConfirmedSessionClaimsRefresh } from "@/hooks/common/use-confirmed-session-claims-refresh";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import { ArrowRight } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  InvitationCard,
  InvitationHero,
  InvitationDetails,
  DeclineInvitationDialog,
  CardContent,
} from "@/components/auth/invitation-card";
import {
  invitationAcceptSchema,
  type InvitationAcceptFormValues,
  canonicalEmail,
} from "./invitation-accept-schema";

const INVITATION_SIGN_IN_UNCONFIRMED_MESSAGE =
  "We could not confirm the sign-in for the invited account. Please sign in with that email to finish joining.";
const INVITATION_SIGN_IN_FAILED_MESSAGE =
  "That sign-in link is no longer valid. Please sign in with the invited email address.";

export default function InvitationPage() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const { data: session } = useSession();
  const beginClaimsRefresh = useConfirmedSessionClaimsRefresh();

  const form = useForm<InvitationAcceptFormValues>({
    resolver: zodResolver(invitationAcceptSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const [declineOpen, setDeclineOpen] = useState(false);

  const {
    data: invitation,
    error: invitationError,
    isPending: isValidating,
  } = useValidateInvitation(token);

  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  const openDecline = useCallback(() => setDeclineOpen(true), []);

  const goToSignIn = useCallback(() => router.push("/signin"), [router]);

  const confirmDecline = useCallback(() => {
    if (!token) return;
    declineInvitation.mutate(
      { token },
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
  }, [token, declineInvitation, router]);

  const autoLoginWithToken = useCallback(
    async (autoLoginToken: string): Promise<void> => {
      const outcome = await signInWithMagicToken(autoLoginToken);
      if (outcome.status === "signed-in") {
        window.location.href = "/dashboard";
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

  const onSubmit = useCallback(
    (values: InvitationAcceptFormValues) => {
      if (!token || !invitation) {
        toast.error("Invalid invitation");
        return;
      }
      acceptInvitation.mutate(
        {
          token,
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
        },
        {
          onSuccess: async (data) => {
            toast.success("Account created! Signing you in...");
            if (data?.autoLoginToken) {
              await autoLoginWithToken(data.autoLoginToken);
            } else {
              router.push("/signin");
            }
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [token, invitation, acceptInvitation, router, autoLoginWithToken],
  );

  const handleExistingUserAccept = useCallback(() => {
    if (!token) return;
    if (!session) {
      router.push(`/signin?callbackUrl=/invitation/${token}`);
      return;
    }
    const claimsRun = beginClaimsRefresh();
    acceptInvitation.mutate(
      { token },
      {
        onSuccess: async (data) => {
          toast.success(
            `Joined ${invitation?.organizationName ?? "organization"}!`,
          );
          if (data?.autoLoginToken) {
            await autoLoginWithToken(data.autoLoginToken);
            return;
          }
          const outcome = await claimsRun.confirm();
          if (outcome.status === "superseded") return;
          router.push("/dashboard");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [
    token,
    session,
    router,
    acceptInvitation,
    invitation,
    beginClaimsRefresh,
    autoLoginWithToken,
  ]);

  if (isValidating) {
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

  if (invitationError || !invitation) {
    return (
      <div className="w-full max-w-[480px]">
        <InvitationCard>
          <InvitationHero
            title="Invitation unavailable"
            description={getErrorMessage(invitationError)}
            verified={false}
          />
          <CardContent className="px-6 py-5">
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Ask an organization administrator to send a new invitation if this
              link has expired or was replaced.
            </p>
            <Button className="w-full" onClick={goToSignIn}>
              Go to sign in
            </Button>
          </CardContent>
        </InvitationCard>
      </div>
    );
  }

  if (invitation.userExists) {
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
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  You are currently signed in as{" "}
                  <span className="font-medium">{sessionEmail}</span>.
                  Accepting will sign you in as the invited account instead.
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

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mt-4 space-y-3.5"
                aria-busy={acceptInvitation.isPending}
              >
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  <FormField
                    control={form.control}
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
                            disabled={acceptInvitation.isPending}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
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
                            disabled={acceptInvitation.isPending}
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
                    isPending={acceptInvitation.isPending}
                    loadingText="Accepting invitation..."
                  >
                    Accept invitation
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

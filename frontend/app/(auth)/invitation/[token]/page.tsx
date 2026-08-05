"use client";

import { useCallback, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import {
  signInWithMagicToken,
  useAcceptInvitation,
  useDeclineInvitation,
} from "@/hooks/common/auth-hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { ArrowRight, Mail, MailCheck, ShieldCheck } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatRoleLabel } from "@/features/users/user-invite-roles";

const newUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;

function InvitationCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-32px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/[0.02] ${className ?? ""}`}
    >
      {children}
    </Card>
  );
}

function InvitationHero({
  title,
  description,
  verified = true,
}: {
  title: string;
  description: React.ReactNode;
  verified?: boolean;
}) {
  const HeroIcon = verified ? MailCheck : Mail;
  return (
    <div className="relative border-b border-slate-200/80 bg-slate-50/55 px-5 py-5 sm:px-6">
      <span className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
      <div className="flex items-start gap-3.5 pt-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_8px_20px_-10px_rgba(37,99,235,0.8)]">
          <HeroIcon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">
              {verified ? "Workspace invitation" : "Invitation status"}
            </p>
            {verified ? (
              <span className="hidden items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700 min-[420px]:inline-flex">
                <ShieldCheck className="h-3 w-3" />
                Secure access
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1 max-w-md text-sm leading-5 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function InvitationDetails({
  organizationName,
  role,
  invitedEmail,
  accountEmail,
}: {
  organizationName: string;
  role: string;
  invitedEmail: string;
  accountEmail?: string | null;
}) {
  return (
    <dl className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
      <div className="min-w-0 rounded-lg border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5">
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Workspace
        </dt>
        <dd className="mt-0.5 truncate text-sm font-semibold text-slate-950">
          {organizationName}
        </dd>
      </div>
      <div className="min-w-0 rounded-lg border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5">
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Access role
        </dt>
        <dd className="mt-0.5 truncate text-sm font-semibold text-blue-700">
          {formatRoleLabel(role)}
        </dd>
      </div>
      <div className="min-w-0 rounded-lg border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 min-[420px]:col-span-2">
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Invitation sent to
        </dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-slate-700">
          {invitedEmail}
        </dd>
      </div>
      {accountEmail ? (
        <div className="min-w-0 rounded-lg border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 min-[420px]:col-span-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Signed in as
          </dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-slate-700">
            {accountEmail}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function DeclineInvitationDialog({
  open,
  onOpenChange,
  organizationName,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Decline this invitation?</AlertDialogTitle>
          <AlertDialogDescription>
            This link stops working and {organizationName} is notified that you
            declined. An administrator would have to send you a new invitation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep it</AlertDialogCancel>
          <AlertDialogAction asChild>
            <LoadingButton
              isPending={isPending}
              loadingText="Declining..."
              onClick={onConfirm}
            >
              Decline invitation
            </LoadingButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function InvitationPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const { data: session, update } = useSession();

  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const [declineOpen, setDeclineOpen] = useState(false);

  const goToSignIn = useCallback(() => router.push("/signin"), [router]);

  const {
    data: invitation,
    error: invitationError,
    isPending: isValidating,
  } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () =>
      apiClient.get<{
        email: string;
        organizationName: string;
        role: string;
        userExists: boolean;
      }>("/organization/invitations/validate", { token }),
    enabled: !!token,
    retry: false,
  });

  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  const openDecline = useCallback(() => setDeclineOpen(true), []);

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
      const signedIn = await signInWithMagicToken(autoLoginToken);
      if (signedIn) {
        window.location.href = "/dashboard";
      } else {
        router.push("/signin");
      }
    },
    [router],
  );

  const onSubmit = useCallback(
    (values: NewUserFormValues) => {
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
    acceptInvitation.mutate(
      { token },
      {
        onSuccess: async (data) => {
          toast.success(
            `Joined ${invitation?.organizationName ?? "organization"}!`,
          );
          if (data?.autoLoginToken) {
            await autoLoginWithToken(data.autoLoginToken);
          } else {
            clearBackendTokenCache();
            await update().catch(() => null);
            router.push("/dashboard");
          }
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
    update,
    autoLoginWithToken,
  ]);

  if (isValidating) {
    return (
      <InvitationCard className="w-full max-w-[480px]">
        <div className="flex items-start gap-3.5 border-b border-slate-200/80 px-5 py-5 sm:px-6 sm:py-6">
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
              title="You’re invited"
              description={`Join ${invitation.organizationName} with your existing StreamlineOS account.`}
            />
            <CardContent className="space-y-5 px-6 pb-6 pt-5">
              <InvitationDetails
                organizationName={invitation.organizationName}
                role={invitation.role}
                invitedEmail={invitation.email}
                accountEmail={session?.user?.email}
              />
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
                  disabled={acceptInvitation.isPending || declineInvitation.isPending}
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
            title="You’re invited"
            description={`Create your account to join ${invitation.organizationName}.`}
          />
          <CardContent className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <InvitationDetails
              organizationName={invitation.organizationName}
              role={invitation.role}
              invitedEmail={invitation.email}
            />

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-4 space-y-3.5"
              aria-busy={acceptInvitation.isPending}
            >
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="text-foreground text-xs font-medium"
                  >
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Your first name"
                    autoComplete="given-name"
                    {...form.register("firstName")}
                    disabled={acceptInvitation.isPending}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="text-foreground text-xs font-medium"
                  >
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Your last name"
                    autoComplete="family-name"
                    {...form.register("lastName")}
                    disabled={acceptInvitation.isPending}
                    className="text-sm"
                  />
                </div>
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
                  disabled={acceptInvitation.isPending || declineInvitation.isPending}
                >
                  Decline invitation
                </Button>
              </div>
            </form>
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

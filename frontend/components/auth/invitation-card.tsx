"use client";

import { Mail, MailCheck, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { formatRoleLabel } from "@/features/users/user-invite-roles";

export function InvitationCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_64px_-32px_rgba(15,23,42,0.28)] ring-1 ring-ring/[0.02] ${className ?? ""}`}
    >
      {children}
    </Card>
  );
}

export function InvitationHero({
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
    <div className="relative border-b border-border bg-muted px-5 py-5 sm:px-6">
      <span className="absolute inset-x-0 top-0 h-1 bg-status-info-fill" />
      <div className="flex items-start gap-3.5 pt-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-status-info-fill text-white shadow-[0_8px_20px_-10px_rgba(37,99,235,0.8)]">
          <HeroIcon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-micro font-semibold uppercase tracking-[0.16em] text-status-info-ink">
              {verified ? "Workspace invitation" : "Invitation status"}
            </p>
            {verified ? (
              <span className="hidden items-center gap-1 rounded-full border border-status-info-rule bg-white px-2 py-0.5 text-micro font-semibold text-status-info-ink min-[420px]:inline-flex">
                <ShieldCheck className="h-3 w-3" />
                Secure access
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.025em] text-foreground sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1 max-w-md text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function InvitationDetails({
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
      <div className="min-w-0 rounded-lg border border-border bg-muted px-3.5 py-2.5">
        <dt className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          Workspace
        </dt>
        <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">
          {organizationName}
        </dd>
      </div>
      <div className="min-w-0 rounded-lg border border-border bg-muted px-3.5 py-2.5">
        <dt className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          Access role
        </dt>
        <dd className="mt-0.5 truncate text-sm font-semibold text-status-info-ink">
          {formatRoleLabel(role)}
        </dd>
      </div>
      <div className="min-w-0 rounded-lg border border-border bg-muted px-3.5 py-2.5 min-[420px]:col-span-2">
        <dt className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          Invitation sent to
        </dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
          {invitedEmail}
        </dd>
      </div>
      {accountEmail ? (
        <div className="min-w-0 rounded-lg border border-border bg-muted px-3.5 py-2.5 min-[420px]:col-span-2">
          <dt className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            Signed in as
          </dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
            {accountEmail}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

export function DeclineInvitationDialog({
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

export function InvitationLoadingSkeleton() {
  return (
    <InvitationCard className="w-full max-w-[480px]">
      <div className="flex items-start gap-3.5 border-b border-border px-5 py-5 sm:px-6 sm:py-6">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-muted animate-pulse" />
        <div className="w-full space-y-2 pt-0.5">
          <div className="h-3 w-36 rounded bg-muted animate-pulse" />
          <div className="h-7 w-56 max-w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-72 max-w-full rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div className="h-28 w-full rounded-xl bg-muted animate-pulse" />
        <div className="h-11 w-full rounded-md bg-muted animate-pulse" />
      </div>
    </InvitationCard>
  );
}

export { CardContent };

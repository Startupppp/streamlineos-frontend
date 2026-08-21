"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { Boxes, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRoleLabel } from "@/features/users/user-invite-roles";
import type { PersonAccountAccess } from "@/types/directory/people";
import {
  getInvitationManagementHref,
} from "./person-account-access";
import { formatPersonDate } from "./person-detail-formatters";

interface PersonTabStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?:
    | { label: string; href: string; onClick?: never }
    | { label: string; onClick: () => void; href?: never };
}

export function PersonTabState({
  icon: Icon,
  title,
  description,
  action,
}: PersonTabStateProps) {
  const actionButton = action?.href ? (
    <Button size="sm" asChild>
      <Link href={action.href}>{action.label}</Link>
    </Button>
  ) : action?.onClick ? (
    <Button size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  ) : null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        {actionButton ? <div className="shrink-0">{actionButton}</div> : null}
      </div>
    </div>
  );
}

type InvitedAccountAccess = Extract<
  PersonAccountAccess,
  { state: "INVITED" }
>;

export function PersonInvitationTabState({
  accountAccess,
  surface,
  canManage,
}: {
  accountAccess: InvitedAccountAccess;
  surface: "membership" | "modules";
  canManage: boolean;
}) {
  const expired = accountAccess.invitationStatus === "EXPIRED";
  const roleLabel = formatRoleLabel(accountAccess.role);
  const managementHref = getInvitationManagementHref(accountAccess);
  const description =
    surface === "membership"
      ? expired
        ? `The invitation for ${roleLabel} access sent to ${accountAccess.email} expired on ${formatPersonDate(accountAccess.expiresAt)}. Resend or cancel it before sending another invitation.`
        : `An invitation for ${roleLabel} access is awaiting acceptance from ${accountAccess.email} and expires on ${formatPersonDate(accountAccess.expiresAt)}. They are not a member until they accept.`
      : expired
        ? `The invitation for ${accountAccess.email} has expired. Resend it before assigning modules. Worker setup remains available separately.`
        : `Module access can be assigned after ${accountAccess.email} accepts the pending invitation. Worker setup remains available separately.`;

  return (
    <PersonTabState
      icon={surface === "membership" ? Mail : Boxes}
      title={expired ? "Invitation expired" : "Invitation pending"}
      description={description}
      action={
        canManage && managementHref
          ? { label: "Manage invitation", href: managementHref }
          : undefined
      }
    />
  );
}

export function PersonTabContentSkeleton() {
  return (
    <div className="p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, skeletonIndex) => (
          <div key={skeletonIndex} className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { LockKeyhole, Mail, Phone, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useCan,
  useCanManageOrganizationMembership,
} from "@/hooks/api/access";
import { useUser } from "@/hooks/api/users";
import { UserInviteDialog } from "@/features/directory/users/user-invite-dialog";
import { formatRoleLabel } from "@/lib/constants/user-invite-roles";
import { UserMembershipSection } from "@/features/directory/users/user-membership-section";
import { UserStatusBadge } from "@/features/directory/users/user-status-badge";
import type { OrganizationPerson } from "@/types/directory/people";
import { getPersonAccountAccess } from "./person-account-access";
import {
  PersonInvitationTabState,
  PersonTabContentSkeleton,
  PersonTabState,
} from "./person-detail-tab-state";

interface PersonMembershipTabProps {
  person: OrganizationPerson;
  onRefresh: () => void;
}

export function PersonMembershipTab({
  person,
  onRefresh,
}: PersonMembershipTabProps) {
  const canViewMembers = useCan("settings:view");
  const canInvite = useCanManageOrganizationMembership();
  const [inviteOpen, setInviteOpen] = useState(false);
  const accountAccess = getPersonAccountAccess(person);
  const linkedUserId =
    accountAccess.state === "MEMBER" ? person.userId : null;
  const { data: user, isLoading } = useUser(linkedUserId ?? "", {
    enabled: !!linkedUserId && canViewMembers,
  });

  const handleOpenInvite = useCallback(() => {
    setInviteOpen(true);
  }, []);

  const handleInviteOpenChange = useCallback((nextOpen: boolean) => {
    setInviteOpen(nextOpen);
  }, []);

  if (!canViewMembers) {
    return (
      <PersonTabState
        icon={LockKeyhole}
        title="Membership details unavailable"
        description="You need organization settings access to view login and role information."
      />
    );
  }

  if (accountAccess.state === "INVITED") {
    return (
      <PersonInvitationTabState
        accountAccess={accountAccess}
        surface="membership"
        canManage={canInvite}
      />
    );
  }

  if (accountAccess.state === "NONE") {
    return (
      <>
        <PersonTabState
          icon={UserPlus}
          title="Directory-only person"
          description="No application account is linked. That is valid for contractors, payees, and other people who do not need StreamlineOS access. Invite them only when they need to sign in."
          action={
            canInvite
              ? { label: "Invite as member", onClick: handleOpenInvite }
              : undefined
          }
        />
        {inviteOpen ? (
          <UserInviteDialog
            open={inviteOpen}
            onOpenChange={handleInviteOpenChange}
            defaultEmail={person.workEmail ?? person.personalEmail ?? undefined}
          />
        ) : null}
      </>
    );
  }

  if (!linkedUserId) {
    return (
      <PersonTabState
        icon={LockKeyhole}
        title="Linked account unavailable"
        description="This person already has an organization membership, so another invitation cannot be sent. Refresh to load the linked account."
        action={{ label: "Refresh person", onClick: onRefresh }}
      />
    );
  }

  if (isLoading) return <PersonTabContentSkeleton />;

  if (!user) {
    return (
      <PersonTabState
        icon={LockKeyhole}
        title="Linked account unavailable"
        description="The linked account could not be loaded. Refresh before making any access changes."
        action={{ label: "Refresh person", onClick: onRefresh }}
      />
    );
  }

  const isActive = user.userStatus
    ? user.userStatus === "active"
    : user.isActive;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="h-5 px-1.5 text-micro">
          {formatRoleLabel(user.role)}
        </Badge>
        <UserStatusBadge
          isActive={isActive}
          isDeleted={user.userStatus === "archived"}
        />
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-foreground">{user.email}</span>
        </div>
        {user.phone ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="text-foreground">{user.phone}</span>
          </div>
        ) : null}
      </div>
      <Separator />
      <UserMembershipSection userId={user.id} />
      {canInvite ? (
        <Button variant="outline" size="sm" className="text-xs" asChild>
          <Link href="/settings/users">Open in Members</Link>
        </Button>
      ) : null}
    </div>
  );
}

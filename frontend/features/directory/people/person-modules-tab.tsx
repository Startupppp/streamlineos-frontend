"use client";

import { useCallback, useState } from "react";
import { Boxes, LockKeyhole } from "lucide-react";
import {
  useCan,
  useCanManageOrganizationMembership,
} from "@/hooks/api/access";
import { useUser } from "@/hooks/api/users";
import { UserInviteDialog } from "@/features/directory/users/user-invite-dialog";
import { UserModuleAccessSection } from "@/features/directory/users/user-module-access-section";
import type { OrganizationPerson } from "@/types/directory/people";
import { getPersonAccountAccess } from "./person-account-access";
import {
  PersonInvitationTabState,
  PersonTabContentSkeleton,
  PersonTabState,
} from "./person-detail-tab-state";

interface PersonModulesTabProps {
  person: OrganizationPerson;
  onRefresh: () => void;
}

export function PersonModulesTab({
  person,
  onRefresh,
}: PersonModulesTabProps) {
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
        title="Module assignments unavailable"
        description="Organization settings access is required to manage module assignments."
      />
    );
  }

  if (accountAccess.state === "INVITED") {
    return (
      <PersonInvitationTabState
        accountAccess={accountAccess}
        surface="modules"
        canManage={canInvite}
      />
    );
  }

  if (accountAccess.state === "NONE") {
    return (
      <>
        <PersonTabState
          icon={Boxes}
          title="No module access"
          description="Modules can only be assigned to members who can sign in. If this person needs application access, invite them as a member first."
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
        description="This person already has an organization membership, so another invitation cannot be sent. Refresh to load the linked account before assigning modules."
        action={{ label: "Refresh person", onClick: onRefresh }}
      />
    );
  }

  if (isLoading) return <PersonTabContentSkeleton />;

  if (!user) {
    return (
      <PersonTabState
        icon={Boxes}
        title="Linked account unavailable"
        description="The linked account could not be loaded. Refresh before assigning modules."
        action={{ label: "Refresh person", onClick: onRefresh }}
      />
    );
  }

  const isActive = user.userStatus
    ? user.userStatus === "active"
    : user.isActive;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <UserModuleAccessSection userId={user.id} isMemberActive={isActive} />
    </div>
  );
}

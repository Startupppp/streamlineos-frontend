"use client";

import { useSearchParams } from "next/navigation";
import { useCanManageOrganizationMembership } from "@/hooks/api/access";
import { UserInvitationsPanel } from "./user-invitations-panel";
import { UsersPage } from "./users-page";

export function PeoplePage() {
  const searchParams = useSearchParams();
  const canManageInvitations = useCanManageOrganizationMembership();

  if (
    canManageInvitations &&
    searchParams.get("view") === "invitations"
  ) {
    return <UserInvitationsPanel />;
  }

  return <UsersPage />;
}

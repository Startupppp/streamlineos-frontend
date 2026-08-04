"use client";

import { useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/api/access";
import { UserInvitationsPanel } from "./user-invitations-panel";
import { UsersPage } from "./users-page";

export function PeoplePage() {
  const searchParams = useSearchParams();
  const canManageInvitations = useCan("settings:organization:manage");

  if (
    canManageInvitations &&
    searchParams.get("view") === "invitations"
  ) {
    return <UserInvitationsPanel />;
  }

  return <UsersPage />;
}

"use client";

import { useSearchParams } from "next/navigation";
import { UserInvitationsPanel } from "./user-invitations-panel";
import { UsersPage } from "./users-page";
import { resolvePeopleView } from "./people-section-tabs";

export function PeoplePage() {
  const searchParams = useSearchParams();
  if (resolvePeopleView(searchParams) === "invitations") {
    return <UserInvitationsPanel />;
  }
  return <UsersPage />;
}

"use client";

import { useSearchParams } from "next/navigation";
import { UserInvitationsPanel } from "./user-invitations-panel";
import { UsersPage } from "./users-page";
import { resolvePeopleView } from "./people-section-tabs";

/**
 * The invitations panel gates itself (pending / denied / failed access each
 * have their own state), so it is not gated again here. Gating on an access
 * read that had not resolved yet rendered Members for an invitations URL.
 */
export function PeoplePage() {
  const searchParams = useSearchParams();
  if (resolvePeopleView(searchParams) === "invitations") {
    return <UserInvitationsPanel />;
  }
  return <UsersPage />;
}

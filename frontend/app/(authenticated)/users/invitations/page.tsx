import { Suspense } from "react";
import { UserInvitationsPanel } from "@/features/users/user-invitations-panel";

export const metadata = { title: "Invitations" };

export default function InvitationsPage() {
  return (
    <Suspense>
      <UserInvitationsPanel />
    </Suspense>
  );
}

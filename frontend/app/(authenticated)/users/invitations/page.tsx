import { Suspense } from "react";
import { UserInvitationsPanel } from "@/features/users/user-invitations-panel";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata = { title: "Invitations" };

export default async function InvitationsPage() {
  await requirePermission("hr:employees:manage");
  return (
    <Suspense>
      <UserInvitationsPanel />
    </Suspense>
  );
}

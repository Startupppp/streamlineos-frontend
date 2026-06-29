import { UserInvitationsPanel } from "@/features/users/user-invitations-panel";

export const metadata = { title: "Invitations" };

export default function InvitationsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Pending Invitations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage outstanding invitations for your organization.
        </p>
      </div>
      <UserInvitationsPanel />
    </div>
  );
}

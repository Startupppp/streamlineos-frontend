import { UserInvitationsPanel } from "@/features/users/user-invitations-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";

export const metadata = { title: "Invitations" };

export default function InvitationsPage() {
  return (
    <PageWrapper
      title="Pending Invitations"
      subtitle="Manage outstanding invitations for your organization."
    >
      <UserInvitationsPanel />
    </PageWrapper>
  );
}

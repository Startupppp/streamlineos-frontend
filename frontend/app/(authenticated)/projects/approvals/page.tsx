import { RequireModule } from "@/components/auth/require-module";
import { ApprovalsInboxPage } from "@/features/projects/approvals/approvals-inbox-page";

export default function ApprovalsInboxRoute() {
  return (
    <RequireModule module="PROJECTS">
      <ApprovalsInboxPage />
    </RequireModule>
  );
}

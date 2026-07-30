import { RequireModule } from "@/components/auth/require-module";
import { ApprovalsInboxPage } from "@/features/build/approvals/approvals-inbox-page";

export default function ApprovalsInboxRoute() {
  return (
    <RequireModule module="build">
      <ApprovalsInboxPage />
    </RequireModule>
  );
}

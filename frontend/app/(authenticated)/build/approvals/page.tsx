import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import { ApprovalsInboxPage } from "@/features/build/approvals/approvals-inbox-page";

export default async function ApprovalsInboxRoute() {
  await enforceRouteAccess("/build/approvals");
  return (
    <RequireModule module="build">
      <ApprovalsInboxPage />
    </RequireModule>
  );
}

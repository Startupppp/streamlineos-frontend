import { requirePermission } from "@/lib/rbac/require-permission";
import { PolicyVersionsPage } from "@/features/hr/policies/policy-versions-page";

export default async function Page() {
  await requirePermission("hr:policies:view");
  return <PolicyVersionsPage />;
}

import { requirePermission } from "@/lib/rbac/require-permission";
import { HrPoliciesPage } from "@/features/hr/policies/policies-page";

export default async function Page() {
  await requirePermission("hr:policies:view");
  return <HrPoliciesPage />;
}

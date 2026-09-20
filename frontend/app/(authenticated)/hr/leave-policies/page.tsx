import { requirePermission } from "@/lib/rbac/require-permission";
import { LeavePoliciesPage } from "@/features/hr/leave-policies/leave-policies-page";

export default async function Page() {
  await requirePermission("hr:leaves:manage");
  return <LeavePoliciesPage />;
}

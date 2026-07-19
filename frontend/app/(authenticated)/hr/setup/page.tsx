import { requirePermission } from "@/lib/rbac/require-permission";
import { HrSetupClient } from "@/features/hr/setup/hr-setup-client";

export default async function HrSetupPage() {
  await requirePermission("hr:employees:view");
  return <HrSetupClient />;
}

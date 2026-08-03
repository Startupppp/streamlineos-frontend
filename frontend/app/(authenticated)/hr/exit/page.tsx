import { requirePermission } from "@/lib/rbac/require-permission";
import { ExitManagementPage } from "@/features/hr/exit/exit-management-page";

export default async function HrExitPage() {
  await requirePermission("hr:exit:view");
  return <ExitManagementPage />;
}

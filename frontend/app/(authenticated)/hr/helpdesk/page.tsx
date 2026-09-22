import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportQueuesPage } from "@/features/employee-support";

export default async function HrEmployeeSupportPage() {
  await requirePermission("hr:helpdesk:view");
  return <SupportQueuesPage />;
}

import { requirePermission } from "@/lib/rbac/require-permission";
import { FindExpertPage } from "@/features/hr/employees/find-expert-page";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return <FindExpertPage />;
}

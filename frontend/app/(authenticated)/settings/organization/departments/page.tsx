import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgDepartmentsPage } from "@/features/settings/organization/hierarchy/departments-page";

export default async function DepartmentsRoute() {
  await requirePermission("settings:view");
  return <OrgDepartmentsPage />;
}

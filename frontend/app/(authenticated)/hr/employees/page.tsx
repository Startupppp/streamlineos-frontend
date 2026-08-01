import { requirePermission } from "@/lib/rbac/require-permission";
import { EmployeesListPage } from "@/features/hr/employees/employees-list-page";

export default async function HrEmployeesPage() {
  await requirePermission("hr:employees:view");
  return <EmployeesListPage />;
}

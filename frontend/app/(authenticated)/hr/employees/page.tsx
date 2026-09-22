import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { EmployeesListPage } from "@/features/hr/employees/employees-list-page";
import EmployeesLoading from "./loading";

export default async function HrEmployeesPage() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<EmployeesLoading />}>
      <EmployeesListPage />
    </Suspense>
  );
}

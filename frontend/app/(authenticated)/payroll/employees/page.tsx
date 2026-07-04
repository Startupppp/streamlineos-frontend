import { requirePermission } from "@/lib/rbac/require-permission";
import { EmployeesListPage } from "@/features/payroll/employees/employees-list-page";

export const metadata = { title: "Salary Profiles — Payroll" };

export default async function PayrollEmployeesPage() {
  await requirePermission("payroll:salaries:view");
  return <EmployeesListPage />;
}

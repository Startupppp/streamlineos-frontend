import { requirePermission } from "@/lib/rbac/require-permission";
import { EmployeeDetailPage } from "@/features/payroll/employees/employee-detail-page";

export const metadata = { title: "Salary Profile — Payroll" };

interface Props {
  params: Promise<{ employeeUserId: string }>;
}

export default async function EmployeeProfileDetailPage({ params }: Props) {
  const { employeeUserId } = await params;
  await requirePermission("payroll:salaries:view");
  return <EmployeeDetailPage employeeUserId={employeeUserId} />;
}

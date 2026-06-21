import { EmployeeDetailsView } from "./employee-details-view";
import { getEmployeeById } from "@/server/actions/hr-actions";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function EditEmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  await requirePermission("hr:employees:view");
  const { employeeId } = await params;
  const employee = await getEmployeeById(employeeId);

  if (!employee) {
    notFound();
  }

  return <EmployeeDetailsView employee={employee} />;
}

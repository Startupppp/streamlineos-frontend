import { EmployeeDetailsView } from "./employee-details-view";
import type { EmployeeData } from "./edit-employee-form";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { serverApiClient } from "@/lib/api/server-client";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const [, { employeeId }] = await Promise.all([
    requirePermission("hr:employees:view"),
    params,
  ]);

  let employee: EmployeeData | null = null;
  try {
    employee = await serverApiClient.get<EmployeeData>(`/hr/employees/${employeeId}`);
  } catch {
    return notFound();
  }

  if (!employee) {
    return notFound();
  }

  return <EmployeeDetailsView employee={employee} />;
}

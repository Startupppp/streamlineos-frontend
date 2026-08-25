import { EmployeeDetailsView } from "@/features/hr/employees/detail/employee-details-view";
import {
  employeeDataSchema,
  type EmployeeData,
} from "@/features/hr/employees/detail/employee-data";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { serverGet } from "@/lib/server-fetch";

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
    const response = await serverGet<unknown>(
      `/hr/employees/${employeeId}`,
    );
    employee = employeeDataSchema.parse(response);
  } catch {
    return notFound();
  }

  if (!employee) {
    return notFound();
  }

  return <EmployeeDetailsView employee={employee} />;
}

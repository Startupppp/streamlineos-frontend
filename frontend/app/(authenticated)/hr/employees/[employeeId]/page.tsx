import { Suspense } from "react";
import { EmployeeDetailsView } from "@/features/hr/employees/detail/employee-details-view";
import {
  employeeDataSchema,
  type EmployeeData,
} from "@/features/hr/employees/detail/employee-data";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { serverGet } from "@/lib/server-fetch";
import { isApiError } from "@/lib/api-client";
import EmployeeDetailLoading from "./loading";

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
    employee = await serverGet<EmployeeData>(
      `/hr/employees/${employeeId}`,
      employeeDataSchema,
    );
  } catch (error) {
    if (isApiError(error) && error.status === 404) return notFound();
    throw error;
  }

  if (!employee) return notFound();

  return (
    <Suspense fallback={<EmployeeDetailLoading />}>
      <EmployeeDetailsView employee={employee} />
    </Suspense>
  );
}

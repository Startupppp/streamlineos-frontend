import { Suspense } from "react";
import { EmployeeDetailsView } from "@/features/hr/employees/detail/employee-details-view";
import { EmployeeDetailLoadError } from "@/features/hr/employees/detail/employee-detail-load-error";
import {
  employeeDataSchema,
  type EmployeeData,
} from "@/features/hr/employees/detail/employee-data";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { serverGet } from "@/lib/server-fetch";
import { isApiError, getCorrelationId } from "@/lib/api-envelope";
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
    const correlationId = getCorrelationId(error);
    console.error(
      `[hr/employees/${employeeId}] detail load failed` +
        (correlationId ? ` correlationId=${correlationId}` : ""),
      error,
    );
    return <EmployeeDetailLoadError supportCode={correlationId} />;
  }

  if (!employee) return notFound();

  return (
    <Suspense fallback={<EmployeeDetailLoading />}>
      <EmployeeDetailsView employee={employee} />
    </Suspense>
  );
}

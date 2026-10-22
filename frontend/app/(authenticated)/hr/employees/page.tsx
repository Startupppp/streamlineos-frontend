import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrEmployees } from "@/lib/prefetch/hr-people";
import { EmployeesListPage } from "@/features/hr/employees/employees-list-page";
import EmployeesLoading from "./loading";

async function HrEmployeesHydrated() {
  const state = await prefetchHrEmployees();
  return (
    <HydrationBoundary state={state}>
      <EmployeesListPage />
    </HydrationBoundary>
  );
}

export default async function HrEmployeesPage() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<EmployeesLoading />}>
      <HrEmployeesHydrated />
    </Suspense>
  );
}

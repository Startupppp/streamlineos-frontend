import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ManagerCoveragePage } from "@/features/hr/employees/manager-coverage-page";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense>
      <ManagerCoveragePage />
    </Suspense>
  );
}

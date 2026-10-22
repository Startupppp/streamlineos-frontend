import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ManagerCoveragePage } from "@/features/hr/employees/manager-coverage-page";
import ManagerCoverageLoading from "./loading";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<ManagerCoverageLoading />}>
      <ManagerCoveragePage />
    </Suspense>
  );
}

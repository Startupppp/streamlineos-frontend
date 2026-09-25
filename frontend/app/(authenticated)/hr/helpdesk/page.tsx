import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportQueuesPage } from "@/features/employee-support";
import HrEmployeeSupportLoading from "./loading";

export default async function HrEmployeeSupportPage() {
  await requirePermission("hr:helpdesk:view");
  return (
    <Suspense fallback={<HrEmployeeSupportLoading />}>
      <SupportQueuesPage />
    </Suspense>
  );
}

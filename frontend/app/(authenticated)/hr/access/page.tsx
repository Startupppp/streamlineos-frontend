import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";
import HrAccessLoading from "./loading";

export default async function HrAccessRoute() {
  await requirePermission("hr:access:view");
  return (
    <Suspense fallback={<HrAccessLoading />}>
      <ModuleAccessPage moduleKey="hr" title="HR Access" />
    </Suspense>
  );
}

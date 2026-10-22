import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgChartPage } from "@/features/hr/org-chart";
import OrgChartLoading from "./loading";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense fallback={<OrgChartLoading />}>
      <OrgChartPage />
    </Suspense>
  );
}

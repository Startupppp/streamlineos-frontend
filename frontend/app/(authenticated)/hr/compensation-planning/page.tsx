import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CompensationPlanningPage } from "@/features/hr/enterprise/comp/compensation-planning-page";

export default async function Page() {
  await requirePermission("hr:compensation:manage");
  return (
    <Suspense>
      <CompensationPlanningPage />
    </Suspense>
  );
}

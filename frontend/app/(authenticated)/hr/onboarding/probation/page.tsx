import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ProbationPage } from "@/features/hr/onboarding/probation-page";
import ProbationLoading from "./loading";

export default async function HrProbationRoute() {
  await requirePermission("hr:probation:view");
  return (
    <Suspense fallback={<ProbationLoading />}>
      <ProbationPage />
    </Suspense>
  );
}

import { requirePermission } from "@/lib/rbac/require-permission";
import { ProbationPage } from "@/features/hr/onboarding/probation-page";

export default async function HrProbationRoute() {
  await requirePermission("hr:probation:view");
  return <ProbationPage />;
}

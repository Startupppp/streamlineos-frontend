import { requirePermission } from "@/lib/rbac/require-permission";
import { ScorecardTemplatesPage } from "@/features/recruitment/scorecard-templates/scorecard-templates-page";

export default async function RecruitmentScorecardTemplatesRoute() {
  await requirePermission("hr:interviews:view");
  return <ScorecardTemplatesPage />;
}

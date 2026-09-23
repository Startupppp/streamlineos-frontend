import { requirePermission } from "@/lib/rbac/require-permission";
import { ScorecardAnalyticsClient } from "@/features/hr/recruitment/components/scorecard-analytics-client";

export default async function RecruitmentScorecardAnalyticsRoute() {
  await requirePermission("hr:interviews:view");
  return <ScorecardAnalyticsClient />;
}

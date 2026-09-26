import { requirePermission } from "@/lib/rbac/require-permission";
import { ReportingManagerPolicyPage } from "@/features/hr/reporting-managers/policy/reporting-manager-policy-page";

export default async function HrReportingManagerPolicyPage() {
  await requirePermission("hr:reporting-lines:manage");
  return <ReportingManagerPolicyPage />;
}

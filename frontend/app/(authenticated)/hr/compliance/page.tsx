import { requirePermission } from "@/lib/rbac/require-permission";
import { CompliancePageContent } from "@/features/hr/global/compliance-page-content";

export default async function CompliancePage() {
  await requirePermission("hr:compliance:manage");
  return <CompliancePageContent />;
}

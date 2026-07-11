import { requirePermission } from "@/lib/rbac/require-permission";
import { EmergencyPageContent } from "@/features/hr/enterprise/ops/emergency/emergency-page-content";

export default async function HrEmergencyPage() {
  await requirePermission("hr:emergency:manage");
  return <EmergencyPageContent />;
}

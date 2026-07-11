import { requirePermission } from "@/lib/rbac/require-permission";
import { SafetyPageContent } from "@/features/hr/safety/safety-page-content";

export default async function HrSafetyPage() {
  await requirePermission("hr:safety:view");
  return <SafetyPageContent />;
}

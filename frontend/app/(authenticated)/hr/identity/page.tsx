import { requirePermission } from "@/lib/rbac/require-permission";
import { IdentityPageContent } from "@/features/hr/enterprise/ops/identity/identity-page-content";

export default async function HrIdentityPage() {
  await requirePermission("hr:identity:view");
  return <IdentityPageContent />;
}

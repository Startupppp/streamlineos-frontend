import { requirePermission } from "@/lib/rbac/require-permission";
import { CompOffPageClient } from "@/features/hr/overtime/comp-off-page-client";

export default async function CompOffPage() {
  await requirePermission("hr:leaves:view");
  return <CompOffPageClient />;
}

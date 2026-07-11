import { requirePermission } from "@/lib/rbac/require-permission";
import { ContingentPageContent } from "@/features/hr/global/contingent-page-content";

export default async function ContingentPage() {
  await requirePermission("hr:contracts:view");
  return <ContingentPageContent />;
}

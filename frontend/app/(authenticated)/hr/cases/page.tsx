import { requirePermission } from "@/lib/rbac/require-permission";
import { CasesPageContent } from "@/features/hr/cases/cases-page-content";

export default async function HrCasesPage() {
  await requirePermission("hr:cases:view");
  return <CasesPageContent />;
}

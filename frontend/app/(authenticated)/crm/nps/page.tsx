import { requirePermission } from "@/lib/rbac/require-permission";
import { NpsSurveysPage } from "@/features/crm/nps/nps-surveys-page";

export default async function CrmNpsPage() {
  await requirePermission("crm:clients:read");
  return <NpsSurveysPage />;
}

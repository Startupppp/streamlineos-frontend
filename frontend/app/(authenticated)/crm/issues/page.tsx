import { requirePermission } from "@/lib/rbac/require-permission";
import { IssuesPage } from "@/features/crm/issues/issues-page";

export default async function IssuesRoute() {
  await requirePermission("crm:issues:view");
  return <IssuesPage />;
}

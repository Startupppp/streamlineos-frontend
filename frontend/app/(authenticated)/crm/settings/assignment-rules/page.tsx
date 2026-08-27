import { requirePermission } from "@/lib/rbac/require-permission";
import { AssignmentRulesPage } from "@/features/crm/settings/assignment-rules/assignment-rules-page";

export default async function AssignmentRulesRoute() {
  await requirePermission("crm:assignment-rules:manage");
  return <AssignmentRulesPage />;
}

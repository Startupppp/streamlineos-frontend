import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgHubClient } from "@/features/hr/org/org-hub-client";

export default async function OrgHubPage() {
  await requirePermission("hr:employees:view");
  return <OrgHubClient />;
}

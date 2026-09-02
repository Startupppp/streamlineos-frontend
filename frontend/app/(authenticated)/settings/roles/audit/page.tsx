import { requirePermission } from "@/lib/rbac/require-permission";
import { RolesAuditPage } from "@/features/settings/roles/roles-audit-page";

export default async function Page() {
  await requirePermission("audit-log:read");
  return <RolesAuditPage />;
}

import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportSettingsAuditLogPage } from "@/features/support/settings/audit-log-page";

export default async function Page() {
  await requirePermission("support:settings:manage");
  return <SupportSettingsAuditLogPage />;
}

import { requirePermission } from "@/lib/rbac/require-permission";
import { TemplatesSettingsPage } from "@/features/hr/templates/templates-settings-page";

export default async function Page() {
  await requirePermission("hr:templates:view");
  return <TemplatesSettingsPage />;
}

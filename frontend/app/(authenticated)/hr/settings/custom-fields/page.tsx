import { requirePermission } from "@/lib/rbac/require-permission";
import { CustomFieldsSettingsPage } from "@/features/hr/custom-fields/custom-fields-settings-page";

export default async function Page() {
  await requirePermission("hr:custom-fields:manage");
  return <CustomFieldsSettingsPage />;
}

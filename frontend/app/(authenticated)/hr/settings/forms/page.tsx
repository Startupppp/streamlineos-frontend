import { requirePermission } from "@/lib/rbac/require-permission";
import { HrFormsSettingsPage } from "@/features/hr/forms/components/hr-forms-settings-page";

export default async function Page() {
  await requirePermission("hr:forms:view");
  return <HrFormsSettingsPage />;
}

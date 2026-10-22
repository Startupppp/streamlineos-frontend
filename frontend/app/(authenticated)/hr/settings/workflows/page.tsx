import { requirePermission } from "@/lib/rbac/require-permission";
import { WorkflowsSettingsPage } from "@/features/hr/workflows/workflows-settings-page";

export default async function Page() {
  await requirePermission("hr:workflows:view");
  return <WorkflowsSettingsPage />;
}

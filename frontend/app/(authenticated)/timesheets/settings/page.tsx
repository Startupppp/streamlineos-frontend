import { requirePermission } from "@/lib/rbac/require-permission";
import { SettingsView } from "@/features/timesheets/settings";

export default async function TimesheetSettingsPage() {
  await requirePermission("timesheets:settings:view");
  return <SettingsView />;
}

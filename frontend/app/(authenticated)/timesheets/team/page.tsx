import { requirePermission } from "@/lib/rbac/require-permission";
import { TeamView } from "@/features/timesheets-core/team";

export default async function TeamTimePage() {
  await requirePermission("timesheets:team:view");
  return <TeamView />;
}

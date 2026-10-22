import { requirePermission } from "@/lib/rbac/require-permission";
import { GoalsPage } from "@/features/hr/goals/goals-page";

export default async function Page() {
  await requirePermission("hr:performance:view");
  return <GoalsPage />;
}
